<?php

namespace App\OauthProvider;

use League\OAuth2\Client\Provider\ResourceOwnerInterface;
use League\OAuth2\Client\Tool\ArrayAccessorTrait;

/**
 * The claims VTK returns on /oauth2/userinfo.
 *
 * Standard OIDC claims keep their standard name; VTK-specific ones carry a `vtk:`
 * prefix. That prefix is wire format and stays as it is, whatever we call the
 * provider on our side. `permissions` is the exception: it has no prefix because
 * the codes belong to this client by construction (`burgieclan.moderate`), and that
 * is the name integrator libraries look for.
 */
class FluxusResourceOwner implements ResourceOwnerInterface
{
    use ArrayAccessorTrait;

    /**
     * Raw response
     *
     * @var array
     */
    protected array $response;

    /**
     * Creates new resource owner.
     *
     * @param  array $response
     * @return void
     */
    public function __construct(array $response = array())
    {
        $this->response = $response;
    }

    /**
     * Get resource owner ID.
     *
     * This is the OIDC `sub`: stable for this client and this member, and the only
     * identifier that survives a member changing their email address.
     *
     * @return string|null
     */
    public function getId(): ?string
    {
        return $this->getValueByKey($this->response, 'sub');
    }

    /**
     * The university email address.
     *
     * Always the university address, never the member's preferred one: VTK keeps
     * `email` fixed as the identity claim precisely so an application matching on it
     * does not lose the account when the member changes their preference. Match on
     * `sub` first and on this second; never on `vtk:preferred_email`.
     *
     * @return string|null
     */
    public function getEmail(): ?string
    {
        return $this->getValueByKey($this->response, 'email');
    }

    /**
     * Get resource owner full name
     *
     * @return string|null
     */
    public function getFullName(): ?string
    {
        return $this->getValueByKey($this->response, 'name');
    }

    /**
     * The KU Leuven student number, e.g. `r0812345`.
     *
     * Null more often than you would expect. It rides on `vtk:student_number`, a
     * scope VTK marks sensitive: the member sees it on the consent screen as its
     * own checkbox and can refuse it while granting the rest. On top of that,
     * members who never signed in through KU Leuven have no r-number on file at
     * all. Anything using this needs a fallback.
     *
     * @return string|null
     */
    public function getStudentNumber(): ?string
    {
        $studentNumber = $this->getValueByKey($this->response, 'vtk:student_number');

        if (!is_string($studentNumber) || '' === trim($studentNumber)) {
            return null;
        }

        return trim($studentNumber);
    }

    /**
     * @return string|null
     */
    public function getPicture(): ?string
    {
        return $this->getValueByKey($this->response, 'picture');
    }

    /**
     * Whether VTK actually answered the question "which permissions does this member
     * hold in Burgieclan".
     *
     * An absent key means we did not get an answer (the `entitlements` scope was not
     * granted, or the claim was not resolved). That is different from an empty list,
     * which is a valid answer meaning "none". The role synchronizer relies on this
     * distinction to avoid stripping a moderator of their roles over a hiccup.
     *
     * @return bool
     */
    public function hasPermissionsClaim(): bool
    {
        return is_array($this->getValueByKey($this->response, 'permissions'));
    }

    /**
     * The permission codes this member holds within Burgieclan, e.g.
     * `burgieclan.moderate`. Empty when VTK did not answer; check
     * {@see hasPermissionsClaim()} to tell the two apart.
     *
     * @return list<string>
     */
    public function getPermissions(): array
    {
        $permissions = $this->getValueByKey($this->response, 'permissions');

        if (!is_array($permissions)) {
            return [];
        }

        return array_values(array_filter($permissions, 'is_string'));
    }

    /**
     * Study programmes as VTK enum values, e.g. `COMPUTER_SCIENCE`.
     *
     * @return list<string>
     */
    public function getStudyProgrammes(): array
    {
        $programmes = $this->getValueByKey($this->response, 'vtk:study_programmes');

        if (!is_array($programmes)) {
            return [];
        }

        return array_values(array_filter($programmes, 'is_string'));
    }

    /**
     * Study years as VTK enum values, e.g. `BACHELOR_1`.
     *
     * @return list<string>
     */
    public function getStudyYears(): array
    {
        $years = $this->getValueByKey($this->response, 'vtk:study_years');

        if (!is_array($years)) {
            return [];
        }

        return array_values(array_filter($years, 'is_string'));
    }

    /**
     * Returns the raw resource owner response.
     *
     * @return array
     */
    public function toArray(): array
    {
        return $this->response;
    }
}
