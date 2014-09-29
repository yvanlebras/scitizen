forever start -l forever.log -o out.log -e err.log app.js --NODE_CONFIG_DIR=.

node app.js --NODE_CONFIG_DIR=.



Ensure 2d index on db location  :

    // For mongo 2.2
    db.images.ensureIndex( { "fields.location" : "2d" })

    // GeoJSON in loc, for mongo 2.4
    db.images.ensureIndex({ "fields.loc" : "2dsphere" })


If using InfluxDb for stats, the *scitizen* database must be created first.


Scitizen supports background tasks scheduling (for image resizing for example) with RabbitMQ (needs to be installed).
This allows to execute multiple message receivers on multiple nodes to horizontaly scale the background tasks management.

To do so, configure rabbitmq in the config file and execute on one or more nodes:

    node tasks/amqp-receives nodeid

    nodeid is a node unique identifier.

If you do not wish to use rabbitmq, simply set the rabbitmq host to empty string ('').
Background tasks can be run manually (or croned) with:

  node tasks/amqp-publish


# License

MIT

# Credits:

Copyright: 2014 IRISA, Olivier Sallou <olivier.sallou@irisa.fr>

Thanks to: JQuery, Foundation, KnockoutJS, Google maps API
Main page icons: from OpenClipArt
Cells image on main page CC-BY Paul Neiman

Main page slider images credits:
  "Magnificent CME Erupts on the Sun - August 31" by NASA Goddard Space Flight Center - Flickr: Magnificent CME Erupts on the Sun - August 31. Licensed under Creative Commons Attribution 2.0 via Wikimedia Commons - http://commons.wikimedia.org/wiki/File:Magnificent_CME_Erupts_on_the_Sun_-_August_31.jpg#mediaviewer/File:Magnificent_CME_Erupts_on_the_Sun_-_August_31.jpg
  "Rat hippocampal neurons grown in vitro" http://www.cellimagelibrary.org/images/8735 - CC-By
# Development

  To run with StrongOps
    slc run

# Installation

Requirements: mongodb, bzip2, influxdb (optional)

 npm install -g grunt-cli
 npm install

# TODO


## in progress


## Questions

* For "free" plan, limit size of image (rescale) ?
* Quotas for Google maps API (remove map when reached ?) or force user to get a google api key ?

## General

* add connection with Google, Facebook ....

## Items

* add rescale image background task according to project plan (limit size for free)
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

* manage project quotas

# Issues:


# Configuration

in config/default.yaml

    general:
        db: "scitizen"
        url: "http://localhost:3000/"
        admin: [ "admin@mydomain.com" ]
        storage: "s3"  # or "pairtree"
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
    analytics:
        # piwik or google or none
        backend: 'piwik'
        google:
          # Google User-ID
          siteid: ''
        piwik:
          # Piwik url like  mydomain.com/piwik
          url: ''
          # Piwik site id
          siteid: ''
    Google:
        apikey: ""  # Google maps API
    plans:
        default:
            quota: 100
            tiny:
              max_width: 600
              max_height: 400
