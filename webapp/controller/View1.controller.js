sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
  ],
  function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("timesheetsclone.controller.View1", {
      onInit: function () {
        // setting up the user model for login (ensure the correct path to userModel.json)
        var model = new JSONModel("model/userModel.json");
        this.getView().setModel(model);
      },

      onLogin: function () {
        // console.log('on login click');

        // Get the values from the view
        var oView = this.getView();

        // Get the values entered by the user
        var ip_username = this.byId("username").getValue();
        var ip_password = this.byId("password").getValue();

        // validation
        if (ip_username === "") {
          MessageToast.show("Username cannot be empty");
          return;
        }

        if (ip_password === "") {
          MessageToast.show("Password cannot be empty");
          return;
        }

        // Get the JSON model
        var oModel = oView.getModel();

        // Get user data from the model (assuming the model has a "user" array)
        var user_val = oModel.getProperty("/user");

        var valid_user = false;
        // console.log(ip_password , ip_username , user_val);

        // Iterate through the users array to check if the credentials match
        var index = 0;
        var flag = 0;
        for (let i = 0; i < user_val.length; i++) {
          if (user_val[i].id == ip_username) {
            flag = 0;
            if (user_val[i].password == ip_password) {
              valid_user = true;
              index = i;
              break;
            } else {
              MessageToast.show("Password is incorrect");
              return;
            }
          } else {
            flag = -1;
          }
        }

        if (flag === -1) {
          MessageToast.show("Username is incorrect");
          return;
        }

        if (valid_user) {
          var global_model = new JSONModel({
            userData: {
              name: ip_username,
              email: user_val[index].email,
            },
          });
          this.getOwnerComponent().setModel(global_model, "active_user");
        }

        // console.log(valid_user);

        if (valid_user) {
          // MessageToast.show('Login Successful');
          var router = this.getOwnerComponent().getRouter();
          router.navTo("RouteView2");
        } else {
          MessageToast.show("Login Unsuccessful");
        }
      },
      onCancel: function () {
        this.byId("username").setValue("");
        this.byId("password").setValue("");
      },
    });
  }
);
