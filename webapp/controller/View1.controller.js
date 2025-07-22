sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
  ],
  function (Controller, JSONModel, MessageToast,Fragment,MessageBox) {
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
        if(ip_username === "" && ip_password === "" ){
          MessageBox.error("Enter credentials");
          return;
        }

        if (ip_username === "") {
          MessageBox.error("Username cannot be empty");
          return;
        }

        if (ip_password === "") {
          MessageBox.error("Password cannot be empty");
          return;
        }

        var valid_user = false;
        var user = JSON.parse(localStorage[ip_username]);
        
        if(localStorage[ip_username]===undefined){
          MessageBox.error("Invalid username");
          return;
        }
        else{
          if(ip_password===atob(user.password)){
            valid_user = true;
          }
        }

        if (valid_user) {
          
          var global_model = new JSONModel({
            userData: {
              name: ip_username,
              email: user.email
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
      async onSignup(){
        if(!this.oDialogSign || this.oDialogSign === null){
          this.oDialogSign = await Fragment.load({
            id : this.getView().getId() ,
            name : "timesheetsclone.fragments.signup",
            controller : this
          });
          this.getView().addDependent(this.oDialogSign);
        }

        this.oDialogSign.open();
      },
      onClose(){
        this.getView().byId("idRegisterName").setValue("");
        this.getView().byId("idRegisterUsername").setValue("");
       this.getView().byId("idRegisterEmail").setValue("");
        this.getView().byId("idRegisterPwd").setValue("");
        this.getView().byId("idRegisterCPwd").setValue("");
        this.oDialogSign.close();
      },

      onRegister(){
        var name = this.getView().byId("idRegisterName").getValue();
        var uname = this.getView().byId("idRegisterUsername").getValue();
        var email = this.getView().byId("idRegisterEmail").getValue();
        var pwd = this.getView().byId("idRegisterPwd").getValue();
        var cpwd = this.getView().byId("idRegisterCPwd").getValue();

        if(name==="" || name===" "){
          MessageBox.error("Please enter fullname");
          return;
        }
        else if(uname==="" || uname===" "){
          MessageBox.error("Please enter username");
          return;
        }
        else if(email==="" || email===" "){
          MessageBox.error("Please enter email");
          return;
        }
        else if(pwd==="" || pwd===" "){
          MessageBox.error("Please enter password");
          return;
        }
        else if(cpwd==="" || cpwd===" "){
          MessageBox.error("Final password doesn't match");
          return;
        }
        else{
          if(!(localStorage[email]===undefined)){
            MessageBox.error("User already existes");
            return;
          }
          else{
            if(!(localStorage['sandy']===undefined)){
              MessageBox.error("Username already taken");
              return;
            }
            else{
              
              if(pwd===cpwd){
                pwd = btoa(pwd);
                var user ={
                  name : name,
                  username : uname,
                  email : email,
                  password : pwd
                }

                localStorage[uname] = JSON.stringify(user);
                MessageBox.success("User created succesfully");
                this.onClose();
              }
              else{
                MessageBox.error("Passwords don't match");
                return;
              }
            }
          }
        }
      }
    });
  }
);
