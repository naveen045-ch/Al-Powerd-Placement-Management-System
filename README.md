# AI-Powered Placement, Skill Assessment & Career Management System
## Phase 1 — Backend Foundation

### Stack
- Java 21
- Spring Boot 3.5.x
- Spring Security
- JWT (jjwt)
- Spring Data JPA / Hibernate
- MySQL
- Maven
- Swagger/OpenAPI (dependency prepared for later phases)

### Phase 1 includes
- Clean layered backend architecture
- User registration/login
- JWT authentication
- Role-based authorization
- STUDENT, RECRUITER, PLACEMENT_OFFICER, ADMIN roles
- User and role database model
- Student profile model
- Recruiter profile model
- Company model
- Global exception handling
- Request validation
- CORS configuration
- Password hashing
- Seed/demo accounts
- MySQL schema configuration

## Project structure

```text
src/main/java/com/placement/career
├── PlacementCareerApplication.java
├── config
│   ├── DataInitializer.java
│   └── SecurityConfig.java
├── controller
│   ├── AuthController.java
│   └── UserController.java
├── dto
│   ├── AuthResponse.java
│   ├── LoginRequest.java
│   ├── RegisterRequest.java
│   └── UserResponse.java
├── entity
│   ├── Company.java
│   ├── RecruiterProfile.java
│   ├── Role.java
│   ├── RoleName.java
│   ├── StudentProfile.java
│   └── User.java
├── exception
│   ├── ApiError.java
│   ├── GlobalExceptionHandler.java
│   └── ResourceNotFoundException.java
├── repository
│   ├── CompanyRepository.java
│   ├── RecruiterProfileRepository.java
│   ├── RoleRepository.java
│   ├── StudentProfileRepository.java
│   └── UserRepository.java
├── security
│   ├── CustomUserDetailsService.java
│   ├── JwtAuthenticationFilter.java
│   └── JwtService.java
└── service
    ├── AuthService.java
    └── UserService.java
```

## Database setup

Create a MySQL database:

```sql
CREATE DATABASE placement_career_db;
```

Then configure credentials in `src/main/resources/application.properties`
or use environment variables:

```text
DB_URL=jdbc:mysql://localhost:3306/placement_career_db
DB_USERNAME=root
DB_PASSWORD=your_password
JWT_SECRET=replace-with-a-long-random-secret
```

## Run

```bash
mvn clean install
mvn spring-boot:run
```

Backend starts on:

```text
http://localhost:8080
```

## Demo accounts

The application creates these accounts on startup:

```text
Admin:
email: admin@placement.local
password: Admin@123

Placement Officer:
email: officer@placement.local
password: Officer@123

Recruiter:
email: recruiter@placement.local
password: Recruiter@123

Student:
email: student@placement.local
password: Student@123
```

Change these passwords before any real deployment.

## API examples

### Register
POST `/api/auth/register`

```json
{
  "fullName": "Naveen Chandravanshi",
  "email": "naveen@example.com",
  "password": "Password@123",
  "role": "STUDENT"
}
```

### Login
POST `/api/auth/login`

```json
{
  "email": "student@placement.local",
  "password": "Student@123"
}
```

The response contains a JWT token. Send it as:

```text
Authorization: Bearer <token>
```

### Current user
GET `/api/users/me`

### Admin-only endpoint
GET `/api/users/all`

## Phase 2
Next modules should add:
- Job and Company management
- Student skills
- Resume upload
- Job applications
- Assessment engine
- Recruiter workflow
- Placement drives
