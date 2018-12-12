# PERF-UI

Quick and easy start

1. **Install Docker**

2. **Start container and pass 3 config options and mount reports folder:**

    `n` - number of test executions

    `t` - test file name

    `e` - test environment or scenario from test file

For example:

    docker run -t -v <your_local_path_to_reports>:/tmp/reports getcarrier/perf-ui \
    -n 1 \
    -t ExampleTest.yaml \
    -e example 

Results you can find at:

    your_local_path_to_reports