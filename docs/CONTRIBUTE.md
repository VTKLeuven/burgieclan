# Contribution Guide

## Development

### Workflow

Feature development follows a hierarchical branch structure where each layer (backend, API, frontend) builds upon the previous one:

```
main
└── release
    └── feature/feature-name
        └── feature/feature-name/backend
            └── feature/feature-name/api
                └── feature/feature-name/frontend
```

Development starts with a feature branch from release. Backend implementation comes first - create your backend branch from the feature branch and implement all entity and service layer changes. Also implement factory and fixtures if needed. Do not forget to create migrations if you make new/adjust existing entities, also create unit tests to test for border cases and intended use. Once complete, create a pull request to merge these changes back into the feature branch.

API development branches from your backend branch, ensuring all necessary backend code is available. Implement API resources, mappers and test the API in your development backend branch at /api. Also create comprehensive unit tests. Then create a pull request to merge into the feature branch.

Frontend development branches from the API branch, providing access to both backend and API changes. After implementing UI components and hooks, create a pull request to merge into the feature branch. Tests at this level are only needed if extensive logic is used.

Finally, once all components are merged and tested, create a pull request to merge the feature branch into release. The made changes will be reviewed.

### Debugging

The application can be run locally in development mode. Each component (backend, API, frontend) has its own debugging configuration:

[Your debugging information here]

### Tests

Each layer requires specific tests:
- Backend & API: Unit tests for entities and API resources
- Frontend: ...

Run tests before creating pull requests to ensure all checks will pass.

## Coding Guidelines

Our codebase follows these principles:
- Backend:
    - Entities start with capital
    - Camel case in entity properties
    - Only simple add/remove etc logic in entity class
    - More extensive logic in Repository
- Frontend: 
    - Reuse existing components
    - 

Code formatting is enforced through linters and formatters in each project.

## Pull Requests

Each PR should focus on changes for its specific layer:
- Backend PR: Only entity, repository, factory, fixtures, ... changes
- API PR: Only resource, mapper, API unit test, ... changes
- Frontend PR: Only UI, hook, ... changes
- Feature PR: Complete feature review before merging to release

PRs should include:
- Clear description of changes
- Link to related issue
- Test coverage for new code
- Updated documentation where relevant

## Finding an Issue to Work On

[Your issue guidelines here]

## Translations

Translations can be made in 'frontend/src/translations'. 
