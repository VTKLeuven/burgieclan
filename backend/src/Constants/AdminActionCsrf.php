<?php

namespace App\Constants;

/**
 * The CSRF token on the custom admin actions that admin/approve_action.html.twig renders as POST
 * buttons, and on the restore buttons in admin/exam_detail.html.twig. Sent as `_token`.
 *
 * POST-only is not enough on its own: the session cookie is SameSite=lax, and that treats every
 * *.vtk.be subdomain as the same site, so any of them could still post here with an admin's
 * cookie. They cannot read the token off the page.
 *
 * One intention for all of these buttons: whoever can read the token off one admin page can read
 * it off any other, so separate ones would add nothing.
 */
final class AdminActionCsrf
{
    public const INTENTION = 'admin_action';
}
