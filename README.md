hapi-ember-data
===============

The project aims to facilitate the development of ember applications by generating ready to consume Ember Data Rest API.

The code generates Rest APIs that are compatible with Ember Data.

Models are based on xml schema definition.

Hapi is used as an http server.

Features:
  - Currently supports only MySql
  - Compatible with default Ember Data's DS.RESTAdapter
  - One XML Schema Definition for all your models
  - Supports query operatoins through http get
    - HTTP GET /api/{model}
    - HTTP GET /api/{model}/{id}
  - Supports Post, Put, Delete operations 
  - Support filtering on specific columns
  - Support searching with a keyword
  - User can control field visibility on select statement to on/off
  - User can control if a field is used in insert / update statments
  - The inserted/updated record is reselected from database and sent back
