const http = require("http");
const { readFile } = require("fs");
const { parse } = require("querystring");
const { MongoClient, ObjectId } = require("mongodb");
const mongoURL = "mongodb://localhost:27017";
const dbName = "todo";
const collectionName = "data";

http
  .createServer(async (req, res) => {
    if (req.method == "GET" && req.url === "/") {
      const client = new MongoClient(mongoURL);

      try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const totalTaskCount = await collection.countDocuments();

        const completedTaskCount = await collection.countDocuments({
          completed: true,
        });

        const pendingTaskCount = await collection.countDocuments({
          completed: false,
        });

        readFile("./index.html", "utf8", (err, data) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("Internal server error");
          } else {
            const html = data
              .replace("{{totalTaskCount}}", totalTaskCount)
              .replace("{{completedTaskCount}}", completedTaskCount)
              .replace("{{pendingTaskCount}}", pendingTaskCount);
            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(html);
            return res.end();
          }
        });
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal server error");
      } finally {
        await client.close();
      }
    } else if (req.method == "GET" && req.url === "/tasks") {
      const client = new MongoClient(mongoURL);

      try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const tasks = await collection.find().toArray();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(tasks));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal server error");
      } finally {
        await client.close();
      }
    } else if (req.method == "POST" && req.url === "/todo") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        const params = parse(body);
        const taskData = params.task;
        const modifiedData =
          taskData.charAt(0).toUpperCase() + taskData.slice(1);

        const client = new MongoClient(mongoURL);

        try {
          await client.connect();
          const db = client.db(dbName);
          const collection = db.collection(collectionName);

          const result = await collection.insertOne({
            task: modifiedData,
            completed: false,
          });

          //console.log(`Added item: ${taskData}`);
          res.writeHead(302, { location: "/" });
          res.end();
        } catch (err) {
          console.error(err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        } finally {
          await client.close();
        }
      });
    } else if (req.method == "POST" && req.url === "/update-task") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        const { taskId, newTask, completed } = JSON.parse(body);
        //console.log(`Received task ID: ${taskId}`);

        const client = new MongoClient(mongoURL);

        try {
          await client.connect();
          const db = client.db(dbName);
          const collection = db.collection(collectionName);

          if (newTask !== undefined) {
            await collection.updateOne(
              { _id: new ObjectId(taskId) },
              { $set: { task: newTask, completed: completed } }
            );
            //console.log(`${task} changed to ${newTask}`);
          } else {
            await collection.updateOne(
              { _id: new ObjectId(taskId) },
              { $set: { completed: completed } }
            );
            //console.log(`Updated item: ${task}`);
          }

          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Task updated successfully");
        } catch (err) {
          console.error(err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        } finally {
          await client.close();
        }
      });
    } else if (req.method == "POST" && req.url === "/delete-task") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        const { taskId } = JSON.parse(body);

        const client = new MongoClient(mongoURL);

        try {
          await client.connect();
          const db = client.db(dbName);
          const collection = db.collection(collectionName);

          await collection.deleteOne({
            _id: new ObjectId(taskId),
          });
          //console.log(`Deleted item: ${task}`);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Task deleted successfully");
        } catch (err) {
          console.error(err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        } finally {
          await client.close();
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
  })
  .listen(5000, () => {
    console.log(`Listening on port 5000`);
  });
