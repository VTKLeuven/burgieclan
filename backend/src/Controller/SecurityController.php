<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Controller;

use App\Entity\User;
use App\Security\FluxusAuthenticator;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\OAuth2Client;
use LogicException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;
use Symfony\Component\Security\Http\Util\TargetPathTrait;

/**
 * Controller used to manage the application security.
 * See https://symfony.com/doc/current/security/form_login_setup.html.
 *
 * @author Ryan Weaver <weaverryan@gmail.com>
 * @author Javier Eguiluz <javier.eguiluz@gmail.com>
 */
#[Route('/admin')]
final class SecurityController extends AbstractController
{
    use TargetPathTrait;

    /*
     * The $user argument type (?User) must be nullable because the login page
     * must be accessible to anonymous visitors too.
     */
    #[Route('/login', name: 'security_login')]
    public function login(#[CurrentUser] ?User $user, Request $request, AuthenticationUtils $helper): Response
    {
        // if user is already logged in, don't display the login page again
        if ($user) {
            return $this->redirectToRoute('admin');
        }

        // this statement solves an edge-case: if you change the locale in the login
        // page, after a successful login you are redirected to a page in the previous
        // locale. This code regenerates the referrer URL whenever the login page is
        // browsed, to ensure that its locale is always the current one.
        $this->saveTargetPath($request->getSession(), 'main', $this->generateUrl('admin'));

        return $this->render(
            'security/login.html.twig',
            [
                // last username entered by the user (if any)
                'last_username' => $helper->getLastUsername(),
                // last authentication error (if any)
                'error' => $helper->getLastAuthenticationError(),
            ]
        );
    }

    #[Route("/login/fluxus", name: "login_fluxus")]
    public function loginFluxus(Request $request, ClientRegistry $clientRegistry)
    {
        //This is handled in the FluxusAuthenticator
    }

    #[Route("/login/fluxus/start", name: "login_fluxus_start")]
    public function loginFluxusStart(Request $request, ClientRegistry $clientRegistry): RedirectResponse
    {
        /** @var OAuth2Client $oauthClient */
        $oauthClient = $clientRegistry->getClient("fluxus_backend");

        // redirect() is what generates the PKCE verifier, so read it back afterwards
        // and park it in the session for FluxusAuthenticator to pick up.
        $response = $oauthClient->redirect();

        // Same guard as FluxusOAuthInitiateController: an empty verifier here means
        // FluxusProvider stopped declaring an S256 PKCE method, which would break
        // every admin login at the callback with a far less obvious error.
        $pkceVerifier = $oauthClient->getOAuth2Provider()->getPkceCode();
        if (null === $pkceVerifier || '' === $pkceVerifier) {
            throw new LogicException(
                'The OAuth provider produced no PKCE verifier; check that FluxusProvider::getPkceMethod() '
                . 'still returns S256.'
            );
        }

        $request->getSession()->set(FluxusAuthenticator::PKCE_SESSION_KEY, $pkceVerifier);

        return $response;
    }

    /**
     * This is the route the user can use to logout.
     *
     * But, this will never be executed. Symfony will intercept this first
     * and handle the logout automatically. See logout in config/packages/security.yaml
     */
    #[Route('/logout', name: 'security_logout')]
    public function logout(): void
    {
        throw new \Exception('This should never be reached!');
    }
}
