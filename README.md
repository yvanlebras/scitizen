forever start -l forever.log -o out.log -e err.log app.js --NODE_CONFIG_DIR=.

node app.js --NODE_CONFIG_DIR=.



Ensure 2d index on db location  :

    // For mongo 2.2
    db.images.ensureIndex( { "fields.location" : "2d" })

    // GeoJSON in loc, for mongo 2.4
    db.images.ensureIndex({ "fields.loc" : "2dsphere" })



# TODO

## General

* Manage user login/logout in interface (menu status)
* check permissions : public or private with api key
* registration/user management/password encryption
* Statistics on project page (per image, global?)

## Items

* anti-spam on submission
* require approval option on submission
* Direct to S3 file upload after form approval (need auth token and CORS) instead of file upload and transfer to S3
* For S3, get remote HTTP file access directly instead of using local cache
* Manage S3 or pairtree storage


## project creation

* check name duplicates
* add optional url for projects managing themselves  the web page
* add optional image

## forms

* add tags

## dashboard

* page for scitizen presentation/access/project selection
* 1 page for projects with themes

## projet setup

* project themes
* provide main page image
* user defined themes

# Issues:

* form creation: when not saved, adding new fields reset values

# Configuration

in config/default.yaml

    general:
        url: "http://localhost:3000/"
        admin: [ "admin@mydomain.com" ]
    mail:
        host: "my.smtp.provider.host"
        port: 465
        secure: true
        user: "XXXX"
        password: "XXXX"
        origin: do-not-reply@mydomain.com
Swift:
    username: ""
    region: "RegionOne"
    password: ""
    authUrl: ""
    container: "scitizen"
    dir: "/tmp/scitizen"

Google:
    apikey: ""  # Google maps API
