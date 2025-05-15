sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/library",
    "sap/base/i18n/date/CalendarType",
    "sap/ui/unified/DateRange",
    "sap/ui/core/format/DateFormat",
  ],
  (
    Controller,
    JSONModel,
    MessageToast,
    CalendarType,
    DateRange,
    library,
    DateFormat
  ) => {
    "use strict";

    return Controller.extend("timesheetsclone.controller.View2", {
      oFormatYyyymmdd: null,

      onInit() {
        var user_model = this.getOwnerComponent().getModel("active_user");
        this.getView().setModel(user_model, "active_user");
        this.Dialog = this.byId("create_task_dialog");

        // sidebar user dialog
        this.userDialog = this.byId("userDialog");
        this.notificationDialog = this.byId("notificationDialog");
        this.reportDialog = this.byId("reportsDialog");

        var task_model = new JSONModel("model/tasks.json");
        this.getView().setModel(task_model);

        this._oPopover = this.byId("commentPopover"); // Get the Popover by ID
        if (!this._oPopover) {
          console.error("Popover not found. Check the ID in XML view.");
        }

        this._oPopoverHoursExtra = this.byId("hoursPopover_extra");
        if (!this._oPopoverHoursExtra) {
          console.error("No popover found");
        }

        // notification popover
        this.notificationPopover = this.byId("notificationPop");
        if (!this.notificationPopover) {
          console.error("No notification popover found");
        }

        // sidebar popover
        this.sidePop = this.byId("sidebarPopover");
        if (!this.sidePop) {
          console.error("No side pop over found");
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

        var oTable = this.byId("idTimesheetTable");

        oTable.attachRowSelectionChange(function (oEvent) {
          var selectedIndices = oTable.getSelectedIndices();
          if (selectedIndices.length > 1) {
            var lastSelectedIndex = oEvent.getParameter("rowIndex");
            oTable.clearSelection();
            oTable.setSelectedIndex(lastSelectedIndex);
          }
        });

        function getStartOfWeek(date) {
          let currentDate = new Date(date);
          let dayOfWeek = currentDate.getDay();

          let difference =
            currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          currentDate.setDate(difference);

          return currentDate;
        }

        let today = new Date();
        let startOfWeek2 = getStartOfWeek(today);

        this.getView()
          .byId("weeklySelectorTimeSheet")
          .setStartDate(startOfWeek2);

        // fragments code
        this._fragments = {};

        // date format setup
        this.oFormatYyyymmdd = DateFormat.getInstance({
          pattern: "yyyy-MM-dd",
          calendarType: CalendarType.Gregorian,
        });
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

        task_list.unshift(newTask);
        taskModel.setProperty("/tasks", task_list);

        this.getView().byId("task_title").setValue("");
        this.getView().byId("task_description").setValue("");
        this.Dialog.close();
      },
      deleteTask() {
        var taskModel = this.getView().getModel();
        var task_list = taskModel.getProperty("/tasks");

        let indexListString = this.getView()
          .byId("taskTable")
          .getSelectedContextPaths();
        console.log(indexListString);
        if (indexListString.length === 0) {
          MessageToast.show("No index selected");
          return;
        }

        let indexToRemove = [];
        for (let i = 0; i < indexListString.length; i++) {
          indexToRemove.push(parseInt(indexListString[i].substr("7")));
        }

        // Sort indices in descending order
        indexToRemove.sort((a, b) => b - a);

        indexToRemove.forEach((index) => {
          task_list.splice(index, 1);
        });

        taskModel.setProperty("/tasks", task_list);

        // Clear selection based on table type
        let taskTable = this.getView().byId("taskTable");
        if (taskTable instanceof sap.ui.table.Table) {
          taskTable.clearSelection();
        } else if (taskTable instanceof sap.m.Table) {
          taskTable.removeSelections(true);
        }
      },
      addComments(oEvent) {
        this._oPopover.openBy(oEvent.getSource());
      },
      onCancelPress() {
        if (this._oPopover) {
          this._oPopover.close();
        }

        if (this._oPopoverHoursExtra) {
          this._oPopoverHoursExtra.close();
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
        // console.log(hours_array);

        let total = 0;

        // check if there are invalid input hours
        for (let i = 0; i < hours_array.length; i++) {
          if (
            parseInt(hours_array[i].time) > 12 ||
            parseInt(hours_array[i].time) < 4
          ) {
            MessageToast.show("Invalid hours");
            return;
          }
          total += parseInt(hours_array[i].time);
          console.log(i);
        }

        // check if comments are empty
        for (let i = 0; i < hours_array.length; i++) {
          if (hours_array[i].comments === "") {
            MessageToast.show("Please add comments");
            return;
          }
        }

        var total_sheets = this.getView().byId("noSubmittedSheets").getText();
        total_sheets = parseInt(total_sheets) + 1;
        total_sheets = JSON.stringify(total_sheets);
        this.getView().byId("noSubmittedSheets").setText(total_sheets);

        for (let i = 0; i < hours_array.length; i++) {
          hours_array[i].time = "0";
          hours_array[i].comments = "";
        }

        sheetModel.setProperty("/timesheets", hours_array);

        MessageToast.show(
          `Submitted succesfully for ${this.getView()
            .byId("projectComboBox")
            .getValue()} `
        );
      },
      onInputChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var oBinding = oInput.getBinding("value");
        var newValue = oInput.getValue();
        oBinding.setValue(newValue);

        // validation for input hours not being more than 10
        var maxValue = oEvent.getParameter("newValue");
        maxValue = parseInt(maxValue, 10);
        if (maxValue > 10) {
          this._oPopoverHoursExtra.openBy(oEvent.getSource());
          oEvent.getSource().setValue("0");
        } else if (maxValue < 0) {
          this._oPopoverHoursExtra.openBy(oEvent.getSource());
        } else {
          this._oPopoverHoursExtra.close();
        }
      },
      handleAppointmentCreateDnD(oControlEvent) {
        oControlEvent.getParameters().startDate();
      },

      // calender controller code

      handleCalendarSelect: function (oEvent) {
        var oCalendar = oEvent.getSource();
        this._updateText(oCalendar.getSelectedDates()[0]);
      },

      _updateText: function (oSelectedDates) {
        var oSelectedDateFrom = this.byId("selectedDateFrom"),
          oSelectedDateTo = this.byId("selectedDateTo"),
          oDate;

        if (oSelectedDates) {
          oDate = oSelectedDates.getStartDate();
          if (oDate) {
            oSelectedDateFrom.setText(this.oFormatYyyymmdd.format(oDate));
          } else {
            oSelectedDateTo.setText("No Date Selected");
          }
          oDate = oSelectedDates.getEndDate();
          if (oDate) {
            oSelectedDateTo.setText(this.oFormatYyyymmdd.format(oDate));
          } else {
            oSelectedDateTo.setText("No Date Selected");
          }
        } else {
          oSelectedDateFrom.setText("No Date Selected");
          oSelectedDateTo.setText("No Date Selected");
        }
      },

      handleSelectThisWeek: function () {
        this._selectWeekInterval(6);
      },

      handleSelectWorkWeek: function () {
        this._selectWeekInterval(4);
      },

      handleWeekNumberSelect: function (oEvent) {
        var oDateRange = oEvent.getParameter("weekDays"),
          iWeekNumber = oEvent.getParameter("weekNumber");

        if (iWeekNumber % 5 === 0) {
          oEvent.preventDefault();
          MessageToast.show(
            "You are not allowed to select this calendar week!"
          );
        } else {
          this._updateText(oDateRange);
        }
      },

      _selectWeekInterval: function (iDays) {
        var oCurrent = new Date(), // get current date
          iWeekStart = oCurrent.getDate() - oCurrent.getDay() + 1,
          iWeekEnd = iWeekStart + iDays, // end day is the first day + 6
          oMonday = new Date(oCurrent.setDate(iWeekStart)),
          oSunday = new Date(oCurrent.setDate(iWeekEnd)),
          oCalendar = this.byId("calendar");

        oCalendar.removeAllSelectedDates();
        oCalendar.addSelectedDate(
          new DateRange({ startDate: oMonday, endDate: oSunday })
        );

        this._updateText(oCalendar.getSelectedDates()[0]);
      },
      cancelTimeOff: function () {
        //removeAllselectedDates() function removes all the selected dates from the calender with id calender the we go to the start and end date text tags where the value is changed and change their value back to initial value No Date Selected using their ids and setText function
        var oCalendar = this.byId("calendar");
        oCalendar.removeAllSelectedDates();
        var oSelectedDateFrom = this.byId("selectedDateFrom");
        var oSelectedDateTo = this.byId("selectedDateTo");
        oSelectedDateFrom.setText("No Date Selected");
        oSelectedDateTo.setText("No Date Selected");
      },
      submitTimeOff: function () {
        var oSelectedDateFrom = this.byId("selectedDateFrom").getText();
        var oSelectedDateTo = this.byId("selectedDateTo").getText();
        if (
          oSelectedDateFrom === "No Date Selected" &&
          oSelectedDateTo === "No Date Selected"
        ) {
          MessageToast.show("No dates selected");
        } else {
          var total_timeoff = this.getView()
            .byId("noSubmittedTimeoff")
            .getText();
          if (parseInt(total_timeoff, 10) >= 1) {
            MessageToast.show("Already submitted");
            return;
          } else {
            total_timeoff = parseInt(total_timeoff, 10) + 1;
            total_timeoff = JSON.stringify(total_timeoff);
            this.getView().byId("noSubmittedTimeoff").setText(total_timeoff);
            MessageToast.show("Timeoff booked");
          }
        }
      },
      onItemSelect(oEvent) {
        const oItem = oEvent.getParameter("item");

        if (oItem.getText() === "User") {
          this.userDialog.open();
        } else if (oItem.getText() === "Notifications") {
          var notificationNumber = this.getView()
            .byId("notificationNumber")
            .getText();
          notificationNumber = parseInt(notificationNumber, 10);
          if (notificationNumber < 1) {
            this.getView().byId("notificationHeader").setVisible(false);
            this.getView().byId("notificationNumber").setVisible(false);
            this.getView().byId("noNotification").setVisible(true);
            this.notificationDialog.open();
          } else {
            this.getView().byId("notificationHeader").setVisible(true);
            this.getView().byId("notificationNumber").setVisible(true);
            this.getView().byId("noNotification").setVisible(false);
            this.notificationDialog.open();
          }
        } else if (oItem.getText() === "Reports") {
          this.reportDialog.open();
        }
      },
      closeSidePop() {
        this.sidePop.close();
      },
      onSideDialogClose() {
        this.userDialog.close();
        this.notificationDialog.close();
        this.reportDialog.close();
      },
      createReport() {
        var temp = this.getView().byId("template").getSelectedItem();
        console.log(temp);
        if (temp != null) {
          MessageToast.show("Report created succesfully");
          this.reportDialog.close();
        } else {
          MessageToast.show("Fill required fields");
        }
      },
      onAddRow() {
        let proj = this.getView().byId("projectComboBox").getValue();
        if (proj === "") {
          this.getView().byId("timesheetSubmitButton").setVisible(false);
          this.getView().byId("idTimesheetTable").setVisible(false);
          MessageToast.show("Please select a project");
          return;
        }
        this.getView().byId("timesheetSubmitButton").setVisible(true);
        this.getView().byId("idTimesheetTable").setVisible(true);
      },
      handleSelectionChange: function(oEvent) {
        var changedItem = oEvent.getParameter("changedItem");
        var isSelected = oEvent.getParameter("selected");
  
        var state = "Selected";
        if (!isSelected) {
          state = "Deselected";
        }
  
        MessageToast.show("Event 'selectionChange': " + state + " '" + changedItem.getText() + "'", {
          width: "auto"
        });
      },
  
      handleSelectionFinish: function(oEvent) {
        var selectedItems = oEvent.getParameter("selectedItems");
        var messageText = "Event 'selectionFinished': [";
  
        for (var i = 0; i < selectedItems.length; i++) {
          messageText += "'" + selectedItems[i].getText() + "'";
          if (i != selectedItems.length - 1) {
            messageText += ",";
          }
        }
  
        messageText += "]";
  
        MessageToast.show(messageText, {
          width: "auto"
        });
      }
    });
  }
);
