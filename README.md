# PERF-UI

_Tool for UI Performance testing_

###Quick and easy start

These simple steps will run **Perf-UI** container for test which described in **ExampleTest.yaml**

1. **Install Docker**

2. **Start container and pass 3 config options and mount reports folder:**

    `n` - number of test executions

    `t` - test file name

    `e` - test environment or scenario from test file
    
    `your_local_path_to_reports` - path on your local filesystem where you want to store reports from this execution

For example:
```
    docker run -t -v <your_local_path_to_reports>:/tmp/reports \
    --rm --name perfui \
    getcarrier/perf-ui -n 1 -t ExampleTest.yaml -e example 
```

Results you can find at:

    your_local_path_to_reports
    
###Configuration

Test scenarios can be configured at `yourTestConfig.yaml` file following the description below:

To run you own scenario, configure it and mount `getcarrier/perf-ui` container as:

`-v <your_local_path_to_test>/yourTestConfig.yaml:/tmp/tests/yourTestConfig.yaml`

**yourTestConfig.yaml structure:**

``` 
# InfluxDB to work in pair with Grafana and show results on Grafana dashboard
influxdb:                                   
   url: http://your_influx_url:port/        # Path to InfluxDB
   db_name: your_database                   # Database name
   user:                                    # User name, if you enabled auth in InfluxDB
   password:                                # User password for above user name
# ReportPortal tool
reportportal:                               
   url: https://rp_url/api/v1               # ReportPortal API url
   token: your-rp-uuid-token                # Long-living auth token (UUID) for ReportPortal
   project: your_project_name               # ReportPortal project name where results will be send
   launch_name: UI_Google_Test              # Launch name for your test
   launch_tags:                             # Launch tags to filter existing launches and show them on RP dashboard
     - Google Test
     - www.google.com
# Test Config
example:                                    # Name of environment or scenario of your test
   Google:                                  # Page Name
     url: https://www.google.com            # Page URL
   Google Search:
     url: https://www.google.com/search?q=  # Page url with parameters
     # URL parameters. Each parameter is for different page
     parameters:                            
       - ui+performance                     # Google Search for UI Performance
       - api+performance                    # Google Search for API Performance
     # Check for page loading state
     check:
        # XPATH check for page state
        xpath: //a[contains(text(), "performance")]
   Yahoo:
     url: https://www.yahoo.com
     check:
       # CSS check for page state
       css: div#Masterwrap
```

**By default**, If you are not using Influxdb neither ReportPortal, you will receive screenshots for 
each page from test and Lighthouse report for each test as html page at the _your_local_path_to_reports_.

If you are using **InfluxDB** these fields are required:

    - url
    - db_name
    
User and password are required if you are using auth for InfluxDB


If you are using **ReportPortal** these fields are required:

    - url
    - token
    - project
    - launch_name
    
For **Test Config** required page name (e.g. Google Search) and page url.

**Checks** for pages are not required but desirable to use