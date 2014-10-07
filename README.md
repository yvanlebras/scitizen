# Requirements

## Package dependencies

bzip2
imagemagick
rabbitmq-server (recommended)
mongodb
influxdb (optional for time based statistics)

## Npm dependencies

In scitizen directory run:

    npm install -g grunt-cli
    npm install

Optional: forever can be used to launch the program in background

    npm install -g forever


Ensure 2d index on db location in mongo database:

    mongo scitizen
    // For mongo 2.2
    >db.images.ensureIndex( { "fields.location" : "2d" })
    // GeoJSON in loc, for mongo 2.4
    >db.images.ensureIndex({ "fields.loc" : "2dsphere" })


If using InfluxDb for stats, the *scitizen* database must be created first.

# Running

## Web server

The web server can be executed on one or multiple nodes for scalability.
Server will listen by default on port 3000, you may need an HTTP proxy to forward requests from port 80 to port 3000.

As a daemon:

    forever start -l forever.log -o out.log -e err.log app.js

For development

    node app.js

## Background task processor

The background task processor manage long running tasks such as project deletion, image rescaling etc...
Process can be executed on one or multiple nodes to manage tasks scalability.
Web servers and background task processors dialog via the RabbitMQ messaging application.

As a daemon:

    forever start -l amqp.log -o amqpout.log -e amqperr.log tasks/amqp-receive.js

For development

    node tasks/amqp-receive.js


If you do not wish to use rabbitmq, simply set the rabbitmq host to empty string ('').
Background tasks can then be run manually (or croned) with:

    node tasks/background.js


# License

AGPL for non-commercial usage. For commercial usage, please contact us (support@genouest.org).

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


# TODO


## in progress


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


## projet setup

* project themes
* provide main page image
* user defined themes

## Admin

# Issues:


# Configuration

in config/default.yaml

    general:
        db: "scitizen"
        url: "http://localhost:3000/"
        admin: [ "admin@mydomain.com" ] # To access admin section
        storage: "s3"  # "s3" or "pairtree"
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
        # For s3 and pairtree,  for pairtree storage must be shared between web nodes and background processor nodes,
        # for s3 it only needs to be shared between web nodes.
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
            quota: 100 # Max quota in Mb
            tiny: # for each input image, a tiny image is created to be shown in image lists
              max_width: 600
              max_height: 400
