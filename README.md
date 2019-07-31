# PERF-UI
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fcarrier-io%2Fperf-ui.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fcarrier-io%2Fperf-ui?ref=badge_shield)


_Tool for UI Performance testing_

Quick and easy start
--------------------

These simple steps will run **Perf-UI** container for test which described in [ExampleTest.yaml](https://github.com/carrier-io/perf-ui/blob/master/ExampleTest.yaml)

1. **Install Docker**

2. **Start container and pass 3 config options and mount reports folder:**

    `n` - number of test executions

    `t` - test file name

    `e` - test suite or scenario from test file
    
    `your_local_path_to_reports` - path on your local filesystem where you want to store reports from this execution

For example:
```
    docker run -t -v <your_local_path_to_reports>:/tmp/reports \
    --rm --name perfui \
    getcarrier/perf-ui:release -n 1 -t ExampleTest.yaml -e Demo 
```

Results of test example you can find at  `your_local_path_to_reports` as _Lighthouse_ html reports, _Screenshots_ of opened 
and failed pages (if any) and _JUnit xml report_.

    
Configuration
-------------

To receive all the benefits from Perf-UI you should use [InfluxDB](https://hub.docker.com/_/influxdb) container as data 
storage for page timing API data and [Grafana](https://grafana.com/) for data visualization using our [dashboard](https://github.com/carrier-io/perf-ui/blob/master/dashboards/UI%20Performance-Dashboard.json).

Also you could use the [ReportPortal](http://reportportal.io/) as storage of _screenshots_, _lighthouse results_ and _error logs of failed pages_, as auto analyzer for failed pages.

However neither Report Portal or InfluxDB with Grafana are not required inside test config, without them you will receive 
_Lighthouse_ html reports, _Screenshots_ of opened and failed pages (if any) and _JUnit xml report_ at `your_local_path_to_reports`.

________________________

Test scenarios can be configured as `yaml` (e.g. [ExampleTest.yaml](https://github.com/carrier-io/perf-ui/blob/master/ExampleTest.yaml)) 
file following the config description below:

**ExampleTest.yaml structure example:**

``` 
# InfluxDB config (not required)
# Required fields:
#  - url
#  - db_name 
# User and password are required If your InfluxDB using auth

# InfluxDB config example:
influxdb:                                   
   url: http://your_influx_url:port/        # Path to InfluxDB
   db_name: your_database                   # Database name
   user:                                    # User name, if you enabled auth in InfluxDB
   password:                                # User password for above user name
   
   
# ReportPortal tool config (not required)
# Required fields:
#  - rp_host
#  - rp_token
#  - rp_project_name
#  - rp_launch_name

# ReportPortal config example:
reportportal:                               
   rp_host: rp_url                          # ReportPortal API url
   rp_token: your-rp-uuid-token             # Long-living auth token (UUID) for ReportPortal
   rp_project_name: your_project_name       # ReportPortal project name where results will be send
   rp_launch_name: UI_Google_Test           # Launch name for your test
   rp_launch_tags:                          # Launch tags to filter existing launches and show them on RP dashboard
     - Google Test
     - www.google.com

# Lighthouse tool config (not required)
# Lighthouse config example:
lighthouseDeviceEmulate:                                   
   mobile: (false|true)                     # Enable or disable audit for mobile version               
   desktop: (false|true)                    # Enable or disable audit for desktop device

# Test Config
# For test config is required: 
#  - Test Suite name (e.g. Demo). Name should not contain spaces.
#  - Test Case name (e.g. SearchWithParameters). Name should not contain spaces.
#  - url (e.g.  https://www.etsy.com/ ) Required only for first Test Case. 
#                                       Next Test Case will be executing with this parameter automatically.
#                                       You have opportunity to use "Open URL Action" instead this block

# Test Config Structure (example)
Demo:                                         # Test Suite

  SearchWithParameters:                         # Test Case

    url: https://www.etsy.com/                      # Page URL (Starting URL) 
    parameters:                                     # URL parameters. (Each parameter is for different page)
      - search?q=shoes                               
      - search?q=hats

    steps:                                          # Test Case Step (List of action which needs to be executed. Each action is executed consequentially)

      - url: https://www.etsy.com                       # Open URL Action (Navigate to a specified page.)

      - input:                                        # Input Action (Entering data into specified field)
          xpath: //input[@id='search-query']            # locator for WebElement (You can use "xpath,css,id,name,class" type of locators)
          value: shirt                                  # data which you want to enter

      - check:                                        # Check Action (check page state or WebElement state)
          xpath: //button[@value='Search']              # locator for WebElement (You can use "xpath,css,id,name,class" type of locators)

      - checkIsNot:                                     # Check Element is Not Visible Action (check page state or WebElement state)
          xpath: //button[@value='Search']              # locator for WebElement (You can use "xpath,css,id,name,class" type of locators)

      - click:                                        # Click Action (Click specified WebElement)
          xpath: //button[@value='Search']              # locator for WebElement (You can use "xpath,css,id,name,class" type of locators)

      - switchToFrame:                                # Switch To Frame Action (Switch to specified frame) 
          id: 2                                         # locator for Frame (You can use "xpath","css","id" type of locators)

      - switchToDefault: true                         # Switch To Default Action (Switch to default content) 

      - executeJS:                                    # ExecuteJS Action
          value: window.location.replace("./");         # type here your javascript

    check:                                         # Same as Check Action, you would using when you need simple condition check in open page
        xpath: //div[@class='a-section a-spacing-small a-spacing-top-small']
```

_______________________

#### InfluxDB configuration cases:

1. For using InfluxDB, ***you should have accessible web link to it***.
2. If your InfluxDB and Perf-UI containers located on the same host and ***you do not have accessible web link to InfluxDB***, use link to InfluxDB container as described below:
    - Change db_url at YourTest.yaml to `http://influx_db_link:<your_db_port>/`
    - At perf-ui startup command, before `--name perfui` parameter add `--link <your_influxdb_name_or_id>:influx_db_link`
    - Your run command should looks like:
        ```
            docker run -t -v <your_local_path_to_reports>:/tmp/reports \ 
            -v <your_local_path_to_test>/ExampleTest.yaml:/tmp/tests/ExampleTest.yaml \
            --rm --link <your_influxdb_name_or_id>:influx_db_link --name perfui \
            getcarrier/perf-ui:release -n 1 -t ExampleTest.yaml -e Demo 
        ```

#### To run your configured scenario, mount it to `getcarrier/perf-ui` container as:

`-v <your_local_path_to_test>/ExampleTest.yaml:/tmp/tests/ExampleTest.yaml`


When you configured your own test file run command should looks example below (where _ExampleTest.yaml and other parameters described above_ should be yours):

```
    docker run -t -v <your_local_path_to_reports>:/tmp/reports \ 
    -v <your_local_path_to_test>/ExampleTest.yaml:/tmp/tests/ExampleTest.yaml \
    --rm --name perfui \
    getcarrier/perf-ui:release -n 1 -t ExampleTest.yaml -e Demo
```
#### To run your test in debug mode use argument:

`-d`

____________________

#### Minimal requirements

1. Grafana version not higher then 5.3.4
2. Minimum 2 GB RAM to start container without errors


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fcarrier-io%2Fperf-ui.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fcarrier-io%2Fperf-ui?ref=badge_large)