City Master APIs

1. Get City

API: POST /master/city/getCity

Payload:

{}

2. Get City By ID

API: POST /master/city/getCityById

Payload:

{
  "_id": "CITY_ID"
}

3. Add / Edit City

API: POST /master/city/addEditCity

Add Payload

{
  "countryId": "COUNTRY_ID",
  "stateId": "STATE_ID",
  "cityCode": "AMD",
  "cityName": "Ahmedabad",
  "postalPrefix": "380",
  "latitude": "23.0225",
  "longitude": "72.5714",
  "isActive": true
}

Edit Payload

{
  "_id": "CITY_ID",
  "countryId": "COUNTRY_ID",
  "stateId": "STATE_ID",
  "cityCode": "AMD",
  "cityName": "Ahmedabad",
  "postalPrefix": "380",
  "latitude": "23.0225",
  "longitude": "72.5714",
  "isActive": true
}

4. Delete City

API: POST /master/city/deleteCityById

Payload:

{
  "_id": "CITY_ID"
}