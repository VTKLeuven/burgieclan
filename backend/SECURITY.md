# Security Configuration

This document describes the security measures implemented in the Burgieclan backend using the NelmioSecurityBundle.

## Overview

The [NelmioSecurityBundle](https://symfony.com/bundles/NelmioSecurityBundle/current/index.html) has been installed and configured to provide additional security features for the Symfony application.

## Installed Version

- **nelmio/security-bundle**: ^3.6

## Security Features Enabled

### 1. Content Security Policy (CSP)

CSP helps prevent Cross-Site Scripting (XSS) attacks by controlling which resources the browser is allowed to load.

**Configuration:**
- **default-src**: 'self' - Only allow resources from the same origin
- **script-src**: 'self', 'unsafe-inline' - Allow scripts from same origin and inline scripts (needed for Symfony profiler)
- **style-src**: 'self', 'unsafe-inline' - Allow styles from same origin and inline styles
- **img-src**: 'self', 'data:', 'https:' - Allow images from same origin, data URIs, and HTTPS sources
- **font-src**: 'self', 'data:', 'https:' - Allow fonts from same origin, data URIs, and HTTPS sources
- **connect-src**: 'self' - Only allow AJAX/WebSocket connections to same origin
- **frame-src**: 'self' - Only allow frames from same origin
- **object-src**: 'none' - Disallow plugins like Flash
- **base-uri**: 'self' - Restrict base tag URLs
- **form-action**: 'self' - Forms can only submit to same origin
- **frame-ancestors**: 'none' - Prevent the site from being framed (equivalent to X-Frame-Options: DENY)

**HTTPS-only directives (production):**
- **block-all-mixed-content**: Block HTTP content on HTTPS pages (configured for production environment)
- **upgrade-insecure-requests**: Automatically upgrade HTTP requests to HTTPS (configured for production environment)

**Environment-specific adjustments:**
- **Development**: Additional 'unsafe-eval' allowed for debugging tools, WebSocket connections allowed
- **Test**: CSP is disabled to avoid issues with test runners

### 2. Clickjacking Protection

Prevents the site from being loaded in iframes, protecting against clickjacking attacks.

**Configuration:**
- **X-Frame-Options**: DENY for all paths by default
- Can be configured per-path if needed (e.g., for embed pages)

### 3. Content Type Sniffing Protection

Prevents browsers from MIME-sniffing responses away from the declared content-type.

**Configuration:**
- **X-Content-Type-Options**: nosniff

### 4. Referrer Policy

Controls how much referrer information is shared when users navigate away from the site.

**Configuration:**
- **Referrer-Policy**: strict-origin-when-cross-origin
  - Sends full URL for same-origin requests
  - Sends only origin for cross-origin requests over HTTPS
  - Sends no referrer when downgrading from HTTPS to HTTP

### 5. Permissions Policy (Feature Policy)

Restricts access to browser features and APIs.

**Configuration:**
- **camera**: Blocked - No camera access
- **microphone**: Blocked - No microphone access
- **geolocation**: Blocked - No geolocation access
- **payment**: Blocked - No payment API access
- **usb**: Blocked - No USB access

**Note**: The deprecated `interest_cohort` directive (for blocking FLoC tracking) has been removed as it's no longer needed for modern browsers (Chrome removed FLoC in 2022).

### 6. External Redirect Protection

Prevents redirects to untrusted external domains.

**Configuration:**
- **abort**: true - Abort external redirects by default
- **log**: true - Log external redirect attempts for monitoring
- An allow_list can be configured for trusted external domains if needed

### 7. Forced HTTPS/SSL (HSTS)

**Status**: Commented out by default, should be enabled in production with valid SSL certificate.

When enabled, it forces all connections to use HTTPS and enables HTTP Strict Transport Security (HSTS).

**Recommended Production Configuration:**
```yaml
forced_ssl:
    enabled: true
    hsts_max_age: 31536000  # 1 year in seconds
    hsts_subdomains: true   # Apply to all subdomains
    hsts_preload: false     # Enable only after testing
```

**HSTS Preload**: Only enable `hsts_preload: true` after thorough testing and if you want your domain included in browser HSTS preload lists. This is a long-term commitment and cannot be easily reversed.

## Configuration Files

- **Main configuration**: `backend/config/packages/nelmio_security.yaml`
- **Bundle registration**: `backend/config/bundles.php`

## Customization

### Allowing External Resources

If your application needs to load resources from CDNs or external services, update the CSP configuration:

```yaml
nelmio_security:
    csp:
        enforce:
            script-src:
                - 'self'
                - 'https://cdn.example.com'
            img-src:
                - 'self'
                - 'https://images.example.com'
```

### Allowing Specific External Redirects

If you need to redirect to trusted external domains:

```yaml
nelmio_security:
    external_redirects:
        allow_list:
            - 'example.com'
            - 'trusted-partner.com'
```

### Allowing Iframes for Specific Paths

If you need to allow certain pages to be embedded in iframes:

```yaml
nelmio_security:
    clickjacking:
        paths:
            '^/embed/.*': ALLOW
            '^/.*': DENY
```

## Testing

### Manual Testing

1. Check HTTP headers in browser developer tools:
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy
   - Permissions-Policy

2. Test for CSP violations:
   - Open browser console
   - Navigate through the application
   - Check for CSP violation errors

3. Test clickjacking protection:
   - Try to embed your site in an iframe
   - Should be blocked by X-Frame-Options

### Automated Testing

Run the Symfony console command to verify configuration:
```bash
php bin/console debug:config nelmio_security
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Verify all CSP directives are correct for your application
- [ ] Test that all features work with CSP enabled
- [ ] Configure SSL certificate on the server
- [ ] Uncomment and enable `forced_ssl` in production configuration
- [ ] Test HSTS headers are being sent
- [ ] Consider enabling HSTS preload after initial testing period
- [ ] Monitor logs for external redirect attempts
- [ ] Review and test permissions policy settings

## Security Headers Examples

When properly configured, your application will send headers like:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Resources

- [NelmioSecurityBundle Documentation](https://symfony.com/bundles/NelmioSecurityBundle/current/index.html)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTTP Strict Transport Security (HSTS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)

## Maintenance

- Review and update CSP directives as application features evolve
- Monitor CSP violation reports if reporting is enabled
- Keep the bundle updated to get latest security features
- Review external redirect logs periodically
- Update HSTS max-age gradually (start with shorter periods in production)
