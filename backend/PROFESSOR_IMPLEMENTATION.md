# Professor Entity Implementation

This implementation extends the backend to include a proper Professor entity instead of storing professors as simple u-numbers in JSON format.

## Features

### Professor Entity
- **Fields**: id, uNumber, name, email, pictureUrl, department, title, lastUpdated
- **Validation**: u-number format validation (u1234567)
- **Relationships**: Many-to-many with Course entities

### Admin Interface
- **Professor Management**: Full CRUD operations in EasyAdmin
- **Update from KUL**: Individual professor update button
- **Update All**: Bulk update button for all professors
- **Integration**: Accessible via Courses → Professors menu

### API Endpoints
- **GET /api/professors**: List all professors
- **GET /api/professors/{id}**: Get specific professor
- **Serialization**: Proper API resource with groups

### Course Integration
- **Relationship**: Courses now reference Professor entities instead of JSON array
- **Migration**: Command to convert existing u-number data
- **Admin**: Course admin now shows associated professors

## Migration Process

1. **Run Migration**: Creates professor table and course_professor junction table
   ```bash
   php bin/console doctrine:migrations:migrate
   ```

2. **Migrate Data**: Convert existing JSON professor data
   ```bash
   # Dry run to see what would be migrated
   php bin/console app:migrate-professors --dry-run
   
   # Migrate with basic professor creation
   php bin/console app:migrate-professors
   
   # Migrate and fetch data from KUL
   php bin/console app:migrate-professors --fetch-data
   ```

3. **Remove Old Column**: After successful migration, the JSON professors column can be removed

## Usage

### Adding Professors via Admin
1. Navigate to Admin → Courses → Professors
2. Click "Add Professor"
3. Enter u-number (format: u1234567)
4. Click "Update from KUL" to fetch additional information
5. Save

### Bulk Update
1. Navigate to Professors list in admin
2. Click "Update All from KUL" button
3. All professor information will be refreshed

### API Usage
```json
GET /api/professors
{
  "hydra:member": [
    {
      "id": 1,
      "uNumber": "u1234567",
      "name": "Prof. Dr. John Doe",
      "email": "john.doe@kuleuven.be",
      "pictureUrl": "https://www.kuleuven.be/wieiswie/images/u1234567.jpg",
      "department": "Department of Computer Science",
      "title": "Professor"
    }
  ]
}
```

### Course-Professor Relationship
```json
GET /api/courses/1
{
  "name": "Advanced Programming",
  "professors": [
    {
      "uNumber": "u1234567",
      "name": "Prof. Dr. John Doe",
      "pictureUrl": "..."
    }
  ]
}
```

## KUL Integration

Currently uses a mock implementation that generates realistic test data. To implement real KUL integration:

1. Update `ProfessorService::fetchProfessorFromKul()` method
2. Replace mock data generation with actual KUL API calls
3. Handle authentication and rate limiting as needed

## Testing

Run tests with:
```bash
php bin/phpunit tests/Entity/ProfessorTest.php
php bin/phpunit tests/Service/ProfessorServiceTest.php
```

## Security

- Admin-only access to professor management
- Input validation for u-number format
- Proper entity relationships to prevent data inconsistency