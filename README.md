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

# Initialize database and admin user
make db
make admin
```

> 📝 For detailed setup instructions and available commands, see our [Development Guide](docs/DEVELOPMENT.md)

## Contributing

## Setting up your own Burgieclan

## Feedback

## License

Copyright (c) 2025 Vlaamse Technische Kring vzw. All rights reserved.