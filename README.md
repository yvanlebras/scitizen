forever start -l forever.log -o out.log -e err.log app.js --NODE_CONFIG_DIR=.

node app.js --NODE_CONFIG_DIR=.



Ensure 2d index on db location  :

    // For mongo 2.2
    db.images.ensureIndex( { "fields.location" : "2d" })

    // GeoJSON in loc, for mongo 2.4
    db.images.ensureIndex({ "fields.loc" : "2dsphere" })


# License

MIT

# Credits:

Copyright: 2014 IRISA, Olivier Sallou <olivier.sallou@irisa.fr>

Thanks to: JQuery, Foundation, KnockoutJS, Google maps API
Main page icons: from OpenClipArt

# Development

  To run with StrongOps
    slc run


# TODO

## Questions

* For "free" plan, limit size of image (rescale) ?
* what should we block/do when quota is reached ? (block uploads etc... bad experience for end user, warn project owner before manual blocking?)
* Quotas for Google maps API (remove map when reached ?) or force user to get a google api key ?

## General

* Add quotas per project, admin can increase plan

* In my/ edit_project, use :with project_current binding instead of specific
fields

* Manage account (password modification, API key show and regeneration)



## Items

* add possibility to point an element on an item (location on image of a specific item), at curation time.
* time based statistics for stats.api and stats.google instead of total count
* using stats lib
* list: add $limit and $skip option (to limit number of items to show)
* Direct to S3 file upload after form approval (need auth token and CORS) instead of file upload and transfer to S3
* For S3, get remote HTTP file access directly instead of using local cache

## project creation

* check name duplicates
* add optional url for projects managing themselves the web page
* add optional image

## forms

* add tags

## dashboard

* 1 page for projects with themes

## projet setup

* project themes
* provide main page image
* user defined themes

## Admin

* manage users
* manage project quotas


# Issues:

* On project deletion, all images (mongodb AND storage) should be deleted too, should manage this in background task *tasks* object.

# Configuration

in config/default.yaml

    general:
        db: "scitizen"
        url: "http://localhost:3000/"
        admin: [ "admin@mydomain.com" ]
        storage: "s3"
    mail:
        host: "my.smtp.provider.host"
        port: 465
        secure: true
        user: "XXXX"
        password: "XXXX"
        origin: do-not-reply@mydomain.com
    storage:
        # For s3
        provider: "openstack"
        username: ""
        region: "RegionOne"
        password: ""
        authUrl: ""
        container: "scitizen"
        # For s3 and pairtree
        path: "/tmp/scitizen"

    Google:
      apikey: ""  # Google maps API
