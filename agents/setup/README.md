To try this out, ensure you have Docker Desktop installed, and run:

    docker-compose up -d --build

Then run the following to deploy the crime-map example application to MarkLogic:

    ./gradlew -i mlDeploy
