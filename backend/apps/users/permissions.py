from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    """Allows access only to Admin users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsCandidateRole(permissions.BasePermission):
    """Allows access only to Candidate users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'candidate'


class IsRecruiterRole(permissions.BasePermission):
    """Allows access only to Recruiter users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'recruiter'


class IsCompanyRole(permissions.BasePermission):
    """Allows access only to Company Representative users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'company'


class IsRecruiterOrCompanyRole(permissions.BasePermission):
    """Allows access only to Recruiters or Company Representatives."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['recruiter', 'company', 'admin']


class IsCompanyMember(permissions.BasePermission):
    """
    Allows access to Recruiters/Company Reps who are linked to a company.

    Company verification is deliberately NOT checked here: recruiters can post
    and manage jobs immediately, without waiting for admin approval.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == 'admin':
            return True

        profile = getattr(user, 'profile', None)
        return bool(profile and profile.company)


# Backwards-compatible alias.
#
# The old name implied an admin-verification gate that no longer exists.
# Anything still importing IsVerifiedCompanyMember now gets the non-gating
# membership check instead of an approval requirement.
IsVerifiedCompanyMember = IsCompanyMember
