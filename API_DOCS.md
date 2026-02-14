# API Documentation

## Authentication

### Login
- **Endpoint**: `POST /api/auth/login`
- **Description**: Authenticates a user and returns a session cookie.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (Success)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "teacher",
      "name": "John Doe"
    }
  }
  ```

### Register
- **Endpoint**: `POST /api/auth/register`
- **Description**: Registers a new user (Teacher/Student/Admin).
- **Request Body**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "role": "student",
    "name": "Jane Smith",
    "schoolId": "school-id"
  }
  ```

---

## Assessments

### Create Assessment
- **Endpoint**: `POST /api/assessments`
- **Description**: Creates a new assessment for a specific class.
- **Request Body**:
  ```json
  {
    "title": "Math Quiz 1",
    "subject": "Mathematics",
    "classId": "grade-10a",
    "totalMarks": 50,
    "questions": [...]
  }
  ```

### Get Student Assessments
- **Endpoint**: `GET /api/student/assessments`
- **Description**: Retrieves all assessments assigned to the logged-in student.

---

## Students & Teachers

### Get Student Stats
- **Endpoint**: `GET /api/dashboard/stats`
- **Description**: Returns summary statistics for the dashboard.

### Get Teachers
- **Endpoint**: `GET /api/teachers`
- **Description**: Returns a list of all teachers in the school.

---

## Multi-Tenancy

### Get Schools
- **Endpoint**: `GET /api/admin/schools`
- **Description**: Returns a list of all registered schools (Admin only).
