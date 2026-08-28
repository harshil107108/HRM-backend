# State Master APIs

## Base URL

```text
http://localhost:8080
```

---

## 1. Get State

**API:**
`POST /master/state/getState`

**Payload:**

```json
{}
```

---

## 2. Get State By ID

**API:**
`POST /master/state/getStateById`

**Payload:**

```json
{
    "_id": "STATE_MONGODB_ID"
}
```

---

## 3. Add State

**API:**
`POST /master/state/addEditState`

**Payload:**

```json
{
    "stateId": 4,
    "countryId": "COUNTRY_MONGODB_ID",
    "stateCode": "DL",
    "stateName": "Delhi",
    "gstStateCode": "07",
    "capital": "New Delhi",
    "isActive": true
}
```

---

## 4. Edit State

**API:**
`POST /master/state/addEditState`

**Payload:**

```json
{
    "_id": "STATE_MONGODB_ID",
    "stateId": 4,
    "countryId": "COUNTRY_MONGODB_ID",
    "stateCode": "DL",
    "stateName": "Delhi",
    "gstStateCode": "07",
    "capital": "New Delhi",
    "isActive": true
}
```

---

## 5. Delete State

**API:**
`POST /master/state/deleteStateById`

**Payload:**

```json
{
    "_id": "STATE_MONGODB_ID"
}
```

---

## API Summary

| API                             | Method | Payload    |
| ------------------------------- | ------ | ---------- |
| `/master/state/getState`        | POST   | `{}`       |
| `/master/state/getStateById`    | POST   | `_id`      |
| `/master/state/addEditState`    | POST   | State Data |
| `/master/state/deleteStateById` | POST   | `_id`      |
