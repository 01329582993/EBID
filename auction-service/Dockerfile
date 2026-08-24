FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -B \
    -Dmaven.wagon.http.timeout=600000 \
    -Dmaven.wagon.rto=600000 \
    -Dmaven.wagon.http.retryHandler.count=10 \
    -Dhttp.keepAlive=false

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
