# Burgieclan - Open Source

## The repository

This repository is where we (VTK Leuven IT and sympathizers) develop the code for Burgieclan (originally for KU Leuven Engineering Science students - in Flamish dialect often referred to as 'burgies'), a platform where students from a faculty can share their summaries, solutions and more. This source code is available to everyone under the standard [AGPL](https://github.com/VTKLeuven/burgieclan/blob/main/LICENSE).

## Burgieclan 0.7.0

The Burgieclan web app is divided in a frontend and a backend part. This decision was made to be able to use both **PHP Symfony (backend)** and **next.js (frontend)**.

### Included features

#### Backend

* **User Management**
  * Student authentication through Shibboleth
  * Role-based access control management
  * User data handling and storage

* **Content Management**
  * Document storage and versioning
  * File format validation
  * Content moderation system

* **Curriculum Management**
  * Course management
  * Module management (handles curriculum structure)

#### Frontend

* **User Interface**
  * Homepage
  * Curriculum navigator
  * Account page
  * Course pages
  * Document preview with PDF support
  * Sidebar

* **Core Functionalities**
  * Real-time search with suggestions
  * Comment system on courses and documents
  * Rating interface with upvote system
  * Drag-and-drop file upload
  * Download (all) functionality
  * Announcement system
  * Recent document views

### Planned features

#### Frontend

* Search through documents
* Notification system

## Local development setup

### Prerequisites
- Docker and Docker Compose
- Make (optional)

### Setup
```bash
# Clone and start
git clone https://github.com/VTKLeuven/burgieclan.git
cd burgieclan
make up

# Generate JWT keypair
make backend-shell
php bin/console lexik:jwt:generate-keypair
exit

# Initialize database and admin user
make db
```

> 📝 For detailed setup instructions, alternative setup options and available commands, see our [Development Guide](docs/DEVELOPMENT.md)

## Contributing

There are many ways in which you can participate in this project, for example:

* [Submit bugs and feature requests](https://github.com/microsoft/vscode/issues), and help us verify as they are checked in
* Review [source code changes](https://github.com/microsoft/vscode/pulls)
* Review the [documentation](https://github.com/microsoft/vscode-docs) and make pull requests for anything from typos to additional and new content

If you are interested in fixing issues and contributing directly to the code base,
please see the document [Contribution Guide](docs/CONTRIBUTE.md), which covers the following:

* The development workflow, including debugging and running tests
* Coding guidelines
* Submitting pull requests
* Finding an issue to work on
* Contributing to translations


## Setting up your own Burgieclan

## Feedback

## License

Copyright (c) 2025 Vlaamse Technische Kring vzw. All rights reserved.