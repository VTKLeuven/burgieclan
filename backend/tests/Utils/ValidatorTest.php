<?php

namespace App\Tests\Utils;

use App\Utils\Validator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Exception\InvalidArgumentException;

class ValidatorTest extends TestCase
{
    private Validator $validator;

    protected function setUp(): void
    {
        $this->validator = new Validator();
    }

    /**
     * @dataProvider provideValidUsernames
     */
    public function testValidUsername(string $username): void
    {
        $validatedUsername = $this->validator->validateUsername($username);
        $this->assertEquals($username, $validatedUsername);
    }

    public function provideValidUsernames(): iterable
    {
        yield ['username'];
        yield ['user_name'];
        yield ['my_username'];
        yield ['a_b_c'];
    }

    /**
     * @dataProvider provideInvalidUsernames
     */
    public function testInvalidUsername(?string $username): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validateUsername($username);
    }

    public function provideInvalidUsernames(): iterable
    {
        yield [null];
        yield [''];
        yield ['Username'];  // Contains uppercase
        yield ['user name']; // Contains space
        yield ['user@name']; // Contains special char
        yield ['user123'];   // Contains numbers
        yield ['123'];       // Contains numbers
    }

    /**
     * @dataProvider provideValidPasswords
     */
    public function testValidPassword(string $password): void
    {
        $validatedPassword = $this->validator->validatePassword($password);
        $this->assertEquals($password, $validatedPassword);
    }

    public function provideValidPasswords(): iterable
    {
        yield ['password123'];
        yield ['valid_password'];
        yield ['123456'];
        yield ['abcdef'];
    }

    /**
     * @dataProvider provideInvalidPasswords
     */
    public function testInvalidPassword(?string $password): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validatePassword($password);
    }

    public function provideInvalidPasswords(): iterable
    {
        yield [null];
        yield [''];
        yield ['12345'];  // Too short
        yield ['     '];  // Only whitespace
    }

    /**
     * @dataProvider provideValidEmails
     */
    public function testValidEmail(string $email): void
    {
        $validatedEmail = $this->validator->validateEmail($email);
        $this->assertEquals($email, $validatedEmail);
    }

    public function provideValidEmails(): iterable
    {
        yield ['user@example.com'];
        yield ['user.name@example.com'];
        yield ['user+label@example.com'];
        yield ['user@subdomain.example.com'];
    }

    /**
     * @dataProvider provideInvalidEmails
     */
    public function testInvalidEmail(?string $email): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validateEmail($email);
    }

    public function provideInvalidEmails(): iterable
    {
        yield [null];
        yield [''];
        yield ['invalid-email'];
        yield ['user.example.com'];
        yield ['userexample.com'];  // Changed from 'user@'
    }

    /**
     * @dataProvider provideValidFullNames
     */
    public function testValidFullName(string $fullName): void
    {
        $validatedFullName = $this->validator->validateFullName($fullName);
        $this->assertEquals($fullName, $validatedFullName);
    }

    public function provideValidFullNames(): iterable
    {
        yield ['John Doe'];
        yield ['Jane M. Doe'];
        yield ['Jean-Pierre O\'Malley'];
    }

    public function testInvalidFullName(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validateFullName('');

        $this->expectException(InvalidArgumentException::class);
        $this->validator->validateFullName(null);
    }
}