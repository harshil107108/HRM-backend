# Employee Master APIs

## Base URL

```text
http://localhost:8080
```

All Employee Master APIs use the `POST` method.

---

# 1. Get All Employees

### API

```text
POST /employee/getEmployee
```

### Payload

```json
{}
```

---

# 2. Get Employee By ID

### API

```text
POST /employee/getEmployeeById
```

### Payload

```json
{
    "_id": "EMPLOYEE_MONGODB_ID"
}
```

---

# 3. Employee Help / Dropdown

### API

```text
POST /employee/getEmployeeHelp
```

### Payload

```json
{}
```

### Response

```json
{
    "success": true,
    "data": [
        {
            "_id": "EMPLOYEE_MONGODB_ID",
            "employeeId": "EMP001",
            "employeeName": "John Smith"
        }
    ]
}
```

---

# 4. Add Employee

### API

```text
POST /employee/addEditEmployee
```

### Content-Type

```text
multipart/form-data
```

### Payload

```text
employeeId: EMP001
profileImage: [IMAGE FILE]

firstName: John
middleName: 
lastName: Smith
gender: male
dateOfBirth: 1995-05-15
maritalStatus: single
bloodGroup: O+

companyId: COMPANY_MONGODB_ID
branchId: BRANCH_MONGODB_ID
departmentId: DEPARTMENT_MONGODB_ID
designationId: DESIGNATION_MONGODB_ID
reportingManager: EMPLOYEE_MONGODB_ID
employmentType: FULL_TIME
employeeStatus: ACTIVE
joiningDate: 2026-01-01
confirmationDate: 2026-04-01
probationPeriod: 3

officialEmail: john@company.com
personalEmail: john@gmail.com
mobileNumber: 9876543210
alternateMobile: 9123456780
emergencyContactName: Jane Smith
emergencyContactNumber: 9876501234
countryId: COUNTRY_MONGODB_ID
stateId: STATE_MONGODB_ID
cityId: CITY_MONGODB_ID
postalCode: 380001
currentAddress: Ahmedabad, Gujarat

aadhaarNumber: 123456789012
panNumber: ABCDE1234F
passportNumber: P1234567
drivingLicenseNumber: GJ0120261234567

bankName: BANK_MONGODB_ID
accountNumber: 123456789012
ifscCode: SBIN0001234
uanNumber: 100123456789
pfNumber: PF123456
esiNumber: ESI123456

salaryStructure: SALARY_STRUCTURE_MONGODB_ID
ctc: 600000
basicSalary: 30000

username: john@company.com
password: Password@123
primaryRole: EMPLOYEE
userGroup: USER_GROUP_MONGODB_ID
```

---

# 5. Edit Employee

### API

```text
POST /employee/addEditEmployee
```

### Content-Type

```text
multipart/form-data
```

### Payload

```text
_id: EMPLOYEE_MONGODB_ID

employeeId: EMP001
profileImage: [IMAGE FILE - OPTIONAL]

firstName: John
middleName: 
lastName: Smith
gender: male
dateOfBirth: 1995-05-15
maritalStatus: single
bloodGroup: O+

companyId: COMPANY_MONGODB_ID
branchId: BRANCH_MONGODB_ID
departmentId: DEPARTMENT_MONGODB_ID
designationId: DESIGNATION_MONGODB_ID
reportingManager: EMPLOYEE_MONGODB_ID
employmentType: FULL_TIME
employeeStatus: ACTIVE
joiningDate: 2026-01-01
confirmationDate: 2026-04-01
probationPeriod: 3

officialEmail: john@company.com
personalEmail: john@gmail.com
mobileNumber: 9876543210
alternateMobile: 9123456780
emergencyContactName: Jane Smith
emergencyContactNumber: 9876501234
countryId: COUNTRY_MONGODB_ID
stateId: STATE_MONGODB_ID
cityId: CITY_MONGODB_ID
postalCode: 380001
currentAddress: Ahmedabad, Gujarat

aadhaarNumber: 123456789012
panNumber: ABCDE1234F
passportNumber: P1234567
drivingLicenseNumber: GJ0120261234567

bankName: BANK_MONGODB_ID
accountNumber: 123456789012
ifscCode: SBIN0001234
uanNumber: 100123456789
pfNumber: PF123456
esiNumber: ESI123456

salaryStructure: SALARY_STRUCTURE_MONGODB_ID
ctc: 600000
basicSalary: 30000

username: john@company.com
password: Password@123
primaryRole: EMPLOYEE
userGroup: USER_GROUP_MONGODB_ID
```

> `_id` is required for Edit.
> `profileImage` is optional during Edit if the existing image should remain unchanged.

---

# 6. Delete Employee

### API

```text
POST /employee/deleteEmployeeById
```

### Payload

```json
{
    "_id": "EMPLOYEE_MONGODB_ID"
}
```

---

# 7. Field Reference

## Personal Information

| Field         | Type   | Example        |
| ------------- | ------ | -------------- |
| employeeId    | String | `EMP001`       |
| profileImage  | File   | `employee.png` |
| firstName     | String | `John`         |
| middleName    | String | `Michael`      |
| lastName      | String | `Smith`        |
| gender        | String | `male`         |
| dateOfBirth   | Date   | `1995-05-15`   |
| maritalStatus | String | `single`       |
| bloodGroup    | String | `O+`           |

---

## Organization Information

| Field            | Type       | Example                  |
| ---------------- | ---------- | ------------------------ |
| companyId        | MongoDB ID | `COMPANY_MONGODB_ID`     |
| branchId         | MongoDB ID | `BRANCH_MONGODB_ID`      |
| departmentId     | MongoDB ID | `DEPARTMENT_MONGODB_ID`  |
| designationId    | MongoDB ID | `DESIGNATION_MONGODB_ID` |
| reportingManager | MongoDB ID | `EMPLOYEE_MONGODB_ID`    |
| employmentType   | String     | `FULL_TIME`              |
| employeeStatus   | String     | `ACTIVE`                 |
| joiningDate      | Date       | `2026-01-01`             |
| confirmationDate | Date       | `2026-04-01`             |
| probationPeriod  | Number     | `3`                      |

---

## Contact Information

| Field                  | Type       | Example              |
| ---------------------- | ---------- | -------------------- |
| officialEmail          | String     | `john@company.com`   |
| personalEmail          | String     | `john@gmail.com`     |
| mobileNumber           | String     | `9876543210`         |
| alternateMobile        | String     | `9123456780`         |
| emergencyContactName   | String     | `Jane Smith`         |
| emergencyContactNumber | String     | `9876501234`         |
| countryId              | MongoDB ID | `COUNTRY_MONGODB_ID` |
| stateId                | MongoDB ID | `STATE_MONGODB_ID`   |
| cityId                 | MongoDB ID | `CITY_MONGODB_ID`    |
| postalCode             | String     | `380001`             |
| currentAddress         | String     | `Ahmedabad, Gujarat` |

---

## Document Information

| Field                | Type   | Example           |
| -------------------- | ------ | ----------------- |
| aadhaarNumber        | String | `123456789012`    |
| panNumber            | String | `ABCDE1234F`      |
| passportNumber       | String | `P1234567`        |
| drivingLicenseNumber | String | `GJ0120261234567` |

---

## Payroll Information

| Field           | Type       | Example                       |
| --------------- | ---------- | ----------------------------- |
| bankName        | MongoDB ID | `BANK_MONGODB_ID`             |
| accountNumber   | String     | `123456789012`                |
| ifscCode        | String     | `SBIN0001234`                 |
| uanNumber       | String     | `100123456789`                |
| pfNumber        | String     | `PF123456`                    |
| esiNumber       | String     | `ESI123456`                   |
| salaryStructure | MongoDB ID | `SALARY_STRUCTURE_MONGODB_ID` |
| ctc             | Number     | `600000`                      |
| basicSalary     | Number     | `30000`                       |

---

## Access Information

| Field       | Type       | Example                 |
| ----------- | ---------- | ----------------------- |
| username    | String     | `john@company.com`      |
| password    | String     | `Password@123`          |
| primaryRole | String     | `EMPLOYEE`              |
| userGroup   | MongoDB ID | `USER_GROUP_MONGODB_ID` |

---

# 8. Allowed Values

## Gender

```text
male
female
other
```

## Marital Status

```text
single
married
divorced
widowed
```

## Employment Type

```text
FULL_TIME
PART_TIME
CONTRACT
INTERN
```

## Employee Status

```text
ACTIVE
INACTIVE
NOTICE
```

## Primary Role

```text
EMPLOYEE
MANAGER
HR
ADMIN
```

## Blood Group

```text
A+
A-
B+
B-
AB+
AB-
O+
O-
```

---

# 9. Image Upload

The employee image is sent using:

```text
profileImage
```

Supported image formats:

```text
JPG
JPEG
PNG
WEBP
```

Maximum file size:

```text
5 MB
```

The API uses:

```text
multipart/form-data
```

---

# 10. API Summary

| # | API                                   | Method | Content Type        |
| - | ------------------------------------- | ------ | ------------------- |
| 1 | `/employee/getEmployee`        | POST   | JSON                |
| 2 | `/employee/getEmployeeById`    | POST   | JSON                |
| 3 | `/employee/getEmployeeHelp`    | POST   | JSON                |
| 4 | `/employee/addEditEmployee`    | POST   | multipart/form-data |
| 5 | `/employee/deleteEmployeeById` | POST   | JSON                |

---

# 11. Employee Relationships

```text
Company
   │
   └── Branch
          │
          └── Department
                 │
                 └── Designation
                        │
                        └── Employee
                               │
                               ├── Country
                               │      └── State
                               │             └── City
                               │
                               ├── Reporting Manager
                               ├── Bank
                               ├── Salary Structure
                               └── User Group
```

All relationship fields should contain the corresponding **MongoDB `_id`**.

Example:

```json
{
    "countryId": "68abc123...",
    "stateId": "68abc456...",
    "cityId": "68abc789..."
}
```

---

# 12. Common Success Response

```json
{
    "success": true,
    "message": "Employee added successfully",
    "data": {}
}
```

# 13. Common Error Response

```json
{
    "success": false,
    "message": "Employee not found"
}
```
