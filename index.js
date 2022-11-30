import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";
import * as dotenv from 'dotenv'
dotenv.config()

import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __fileName = fileURLToPath(import.meta.url);
const __dirname = dirname(__fileName);

import { getDate, getDay } from "./date.js";

const app = express();

app.use("/", express.static(join(__dirname + "/public")));

app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', __dirname + '/views');
app.set("view engine", "ejs");

const day = getDate();

// Database Connection

mongoose.connect(process.env.URL);

// Schema

const itemsSchema = {
  name: String
};

const listsSchema = {
  name: String,
  items: [itemsSchema],
};

// Model

const Item = mongoose.model("Item", itemsSchema);

const List = mongoose.model("List", listsSchema);

// Default Items

const item1 = new Item({
  name: "Welcome to your todo list!",
});

const item2 = new Item({
  name: "Hit the + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

// Default List

app.get("/", (req, res) => {
  Item.find({}, (err, foundItems) => {
    if (err) {
      console.log(err);
    } else {
      if (foundItems.length === 0) {
        Item.insertMany(defaultItems, (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("Successfully saved default items to DB.");
          }
        });
        res.redirect("/");
      } else {
        res.render("list", { listHeading: day, newListItem: foundItems });
      }
    }
  });
});

// Add new item

app.post("/", (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName,
  });
  if (listName === day) {
    item.save(err => {
      if(!err){
        res.redirect("/");
      }
    });
  } else {
    List.findOne({ name: listName }, (err, foundList) => {
      if (!err) {
        foundList.items.push(item);
        foundList.save(err => {
          if(!err){
            res.redirect("/" + listName)
          }
        });
      }
    });
  }
});

// Delete item

app.post("/delete", (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  if (listName === day) {
    Item.findByIdAndRemove(checkedItemId, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    List.findOne({ name: listName }, (err, foundList) => {
      if (!err) {
        foundList.items.pull(checkedItemId);
        foundList.save();
        res.redirect("/" + listName);
      }
    });
  }
});

// Custom List

app.get("/:customListName", (req, res) => {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({ name: customListName }, (err, foundList) => {
    if (!err) {
      if (!foundList) {
        // Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems,
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        // Show an existing list
        if (foundList.items.length === 0) {
          List.updateOne(
            { name: foundList.name },
            { items: defaultItems },
            (err) => {
              if (err) {
                console.log(err);
              } else {
                console.log("Successfully saved default items to custom DB.");
              }
            }
          );
          res.redirect("/" + customListName);
        } else {
          res.render("list", {
            listHeading: customListName,
            newListItem: foundList.items,
          });
        }
      }
    } else {
      console.log(err);
    }
  });
});

app.listen(process.env.PORT || 3000, () => console.log("Server is running on port 3000"));