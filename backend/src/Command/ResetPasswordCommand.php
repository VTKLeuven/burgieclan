<?php

namespace App\Command;

use App\Repository\UserRepository;
use App\Utils\Validator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Stopwatch\Stopwatch;

use function Symfony\Component\String\u;

#[AsCommand(
    name: 'app:reset-password',
    description: 'Reset password for a user'
)]
final class ResetPasswordCommand extends Command
{
    private SymfonyStyle $io;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly Validator $validator,
        private readonly UserRepository $users
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->setHelp($this->getCommandHelp())
            // commands can optionally define arguments and/or options (mandatory and optional)
            // see https://symfony.com/doc/current/components/console/console_arguments.html
            ->addArgument('username', InputArgument::OPTIONAL, 'The username of the user')
            ->addArgument(
                'password',
                InputArgument::OPTIONAL,
                'The plain password of the user'
            );
    }

    /**
     * This optional method is the first one executed for a command after configure()
     * and is useful to initialize properties based on the input arguments and options.
     */
    protected function initialize(InputInterface $input, OutputInterface $output): void
    {
        // SymfonyStyle is an optional feature that Symfony provides so you can
        // apply a consistent look to the commands of your application.
        // See https://symfony.com/doc/current/console/style.html
        $this->io = new SymfonyStyle($input, $output);
    }

    /**
     * This method is executed after initialize() and before execute(). Its purpose
     * is to check if some of the options/arguments are missing and interactively
     * ask the user for those values.
     *
     * This method is completely optional. If you are developing an internal console
     * command, you probably should not implement this method because it requires
     * quite a lot of work. However, if the command is meant to be used by external
     * users, this method is a nice way to fall back and prevent errors.
     */
    protected function interact(InputInterface $input, OutputInterface $output): void
    {
        if (
            null !== $input->getArgument('username') && null !== $input->getArgument('password')
        ) {
            return;
        }

        $this->io->title('Reset Password Command Interactive Wizard');
        $this->io->text(
            [
                'If you prefer to not use this interactive wizard, provide the',
                'arguments required by this command as follows:',
                '',
                ' $ php bin/console app:reset-password username password',
                '',
                'Now we\'ll ask you for the value of all the missing command arguments.',
            ]
        );

        // Ask for the username if it's not defined
        $username = $input->getArgument('username');
        if (null !== $username) {
            $this->io->text(' > <info>Username</info>: ' . $username);
        } else {
            $username = $this->io->ask('Username', null, $this->validator->validateUsername(...));
            $input->setArgument('username', $username);
        }

        // Ask for the password if it's not defined
        /** @var string|null $password */
        $password = $input->getArgument('password');

        if (null !== $password) {
            $this->io->text(' > <info>Password</info>: ' . u('*')->repeat(u($password)->length()));
        } else {
            $password = $this->io->askHidden(
                'Password (your type will be hidden)',
                $this->validator->validatePassword(...)
            );
            $input->setArgument('password', $password);
        }
    }

    /**
     * This method is executed after interact() and initialize(). It usually
     * contains the logic to execute to complete this command task.
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $stopwatch = new Stopwatch();
        $stopwatch->start('reset-password-command');

        /** @var string $username */
        $username = $input->getArgument('username');

        /** @var string $plainPassword */
        $plainPassword = $input->getArgument('password');

        $this->validator->validatePassword($plainPassword);

        // Find the user and reset its password
        $user = $this->users->findOneBy(['username' => $username]);

        if (!$user) {
            $this->io->error(sprintf('User "%s" not found', $username));
            return Command::FAILURE;
        }

        // Hash the new password
        $hashedPassword = $this->passwordHasher->hashPassword($user, $plainPassword);
        $user->setPassword($hashedPassword);

        $this->entityManager->flush();

        $this->io->success(
            sprintf(
                'Password for user "%s" was successfully reset',
                $user->getUsername()
            )
        );

        $event = $stopwatch->stop('reset-password-command');
        if ($output->isVerbose()) {
            $this->io->comment(
                sprintf(
                    'Elapsed time: %.2f ms / Consumed memory: %.2f MB',
                    $event->getDuration(),
                    $event->getMemory() / (1024 ** 2)
                )
            );
        }

        return Command::SUCCESS;
    }

    /**
     * The command help is usually included in the configure() method, but when
     * it's too long, it's better to define a separate method to maintain the
     * code readability.
     */
    private function getCommandHelp(): string
    {
        return <<<'HELP'
            The <info>%command.name%</info> command resets the password for a user:

              <info>php %command.full_name%</info> <comment>username password</comment>

            If you omit any of the two required arguments, the command will ask you to
            provide the missing values:

              # command will ask you for the password
              <info>php %command.full_name%</info> <comment>username</comment>
            HELP;
    }
}
