# Holiday Master APIs

## Base URL

```text
http://localhost:8080
```

---

## 1. Get All Holidays

### API

```text
POST /master/holiday/getHoliday
```

### Payload

```json
{}
```

---

## 2. Get Holiday By ID

### API

```text
POST /master/holiday/getHolidayById
```

### Payload

```json
{
    "_id": "HOLIDAY_MONGODB_ID"
}
```

---

## 3. Add Holiday

### API

```text
POST /master/holiday/addEditHoliday
```

### Payload

```json
{
    "holidayName": "Diwali",
    "holidayCode": "DIWALI",
    "holidayDate": "2026-11-08",
    "holidayType": "festival",
    "isActive": true
}
```

---

## 4. Edit Holiday

### API

```text
POST /master/holiday/addEditHoliday
```

### Payload

```json
{
    "_id": "HOLIDAY_MONGODB_ID",
    "holidayName": "Diwali",
    "holidayCode": "DIWALI",
    "holidayDate": "2026-11-08",
    "holidayType": "festival",
    "isActive": true
}
```

---

## 5. Delete Holiday

### API

```text
POST /master/holiday/deleteHolidayById
```

### Payload

```json
{
    "_id": "HOLIDAY_MONGODB_ID"
}
```

---

## 6. Holiday Help / Dropdown

### API

```text
POST /master/holiday/getHolidayHelp
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
            "_id": "HOLIDAY_MONGODB_ID",
            "holidayName": "Diwali",
            "holidayCode": "DIWALI"
        },
        {
            "_id": "HOLIDAY_MONGODB_ID",
            "holidayName": "Republic Day",
            "holidayCode": "REPUBLIC_DAY"
        }
    ]
}
```

---

## Holiday Type Values

The `holidayType` field accepts the following values:

```text
national
regional
festival
company
bank
optional
```

### Example

```json
{
    "holidayName": "Republic Day",
    "holidayCode": "REPUBLIC_DAY",
    "holidayDate": "2026-01-26",
    "holidayType": "national",
    "isActive": true
}
```

---

## API Summary

| # | API                                 | Method |
| - | ----------------------------------- | ------ |
| 1 | `/master/holiday/getHoliday`        | POST   |
| 2 | `/master/holiday/getHolidayById`    | POST   |
| 3 | `/master/holiday/addEditHoliday`    | POST   |
| 4 | `/master/holiday/deleteHolidayById` | POST   |
| 5 | `/master/holiday/getHolidayHelp`    | POST   |
