sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
  ],
  (Controller, JSONModel, MessageToast) => {
    "use strict";

    return Controller.extend("timesheetsclone.controller.View2", {
      onInit() {
        var user_model = this.getOwnerComponent().getModel("active_user");
        this.getView().setModel(user_model, "active_user");
        this.Dialog = this.byId("create_task_dialog");

        var task_model = new JSONModel("model/tasks.json");
        this.getView().setModel(task_model);

        this._oPopover = this.byId("commentPopover"); // Get the Popover by ID
        if (!this._oPopover) {
          console.error("Popover not found. Check the ID in XML view.");
        }

        // function to get start and end of current week
        function getWeekStartAndEndDates() {
          const currentDate = new Date();
          const currentDay = currentDate.getDay();
          const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() + daysToMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return {
            startOfWeek,
            endOfWeek,
          };
        }

        var { startOfWeek, endOfWeek } = getWeekStartAndEndDates();
        var startOfWeek_str = JSON.stringify(startOfWeek);
        var endOfWeek_str = JSON.stringify(endOfWeek);

        this.getView()
          .byId("timesheetsHeader")
          .setText(
            `${startOfWeek_str.slice(1, 11)} to ${endOfWeek_str.slice(1, 11)}`
          );
      },
      onTabSelect(oEvent) {
        var selectedKey = oEvent.getParameter("key");
      },
      createTask() {
        this.Dialog.open();
      },
      onDialogClose() {
        this.getView().byId("task_title").setValue("");
        this.getView().byId("task_description").setValue("");
        this.Dialog.close();
      },
      onSaveTask() {
        // console.log("Saved");
        var taskModel = this.getView().getModel();
        var task_list = taskModel.getProperty("/tasks");
        let task_title = this.getView().byId("task_title").getValue();
        let task_desc = this.getView().byId("task_description").getValue();

        let newTask = {
          title: task_title,
          description: task_desc,
          status: "Not Started",
        };

        task_list.push(newTask);
        taskModel.setProperty("/tasks", task_list);

        this.getView().byId("task_title").setValue("");
        this.getView().byId("task_description").setValue("");
        this.Dialog.close();
      },
      deleteTask() {
        var selectedIndex = this.getView().byId("taskTable").getSelectedIndex();

        var oModel = this.getView().getModel();
        var tasks = oModel.getProperty("/tasks");

        if (selectedIndex === -1) {
          sap.m.MessageToast.show("Select a task to delete");
        } else {
          tasks.splice(selectedIndex, 1);
          oModel.setProperty("/tasks", tasks);
          this.getView().byId("tasksTable").setValue("");
          sap.m.MessageToast.show("Task deleted succesfully");
        }
      },
      addComments(oEvent) {
        this._oPopover.openBy(oEvent.getSource());
      },
      onCancelPress() {
        if (this._oPopover) {
          this._oPopover.close();
        }
      },
      onPopoverSubmit() {
        var pop_selectedIndex = this.getView()
          .byId("idTimesheetTable")
          .getSelectedIndex();
        if (pop_selectedIndex === -1) {
          MessageToast.show("Please select a row");
          return;
        }
        var commentData = this.getView().byId("commentTextArea").getValue();
        var sheetModel = this.getView().getModel();
        var timeSheet = sheetModel.getProperty("/timesheets");
        timeSheet[pop_selectedIndex].comments = commentData;
        sheetModel.setProperty("/timesheets", timeSheet);
        console.log(timeSheet);
        this.getView().byId("commentTextArea").setValue("");
        this.onCancelPress();
      },
      submitTimesheet() {
        var sheetModel = this.getView().getModel();
        var hours_array = sheetModel.getProperty("/timesheets");
        console.log(hours_array);
        let total = 0;
        for (let i = 0; i < hours_array.length; i++) {
          if (
            parseInt(hours_array[i].time) > 12 ||
            parseInt(hours_array[i].time) < 4
          ) {
            MessageToast.show("Invalid hours input");
            return;
          }
          total += parseInt(hours_array[i].time);
          console.log(i);
        }
        if (total < 40) {
          MessageToast.show("Minimum billable hours not fulfilled");
          return;
        }
        var total_sheets = this.getView().byId("noSubmittedSheets").getText();
        total_sheets = parseInt(total_sheets) + 1;
        total_sheets = JSON.stringify(total_sheets);
        this.getView().byId("noSubmittedSheets").setText(total_sheets);
        MessageToast.show("Submitted succesfully");
      },
      onInputChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var oBinding = oInput.getBinding("value");
        var newValue = oInput.getValue();
        oBinding.setValue(newValue);
      },
    });
  }
);
