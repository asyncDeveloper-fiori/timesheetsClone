sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/library",
    "sap/base/i18n/date/CalendarType",
    "sap/ui/unified/DateRange",
    "sap/ui/core/format/DateFormat",
    "sap/m/Table",
  ],
  (
    Controller,
    JSONModel,
    MessageToast,
    CalendarType,
    DateRange,
    library,
    DateFormat,
    Table
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

        indexToRemove.sort((a, b) => b - a);

        indexToRemove.forEach((index) => {
          task_list.splice(index, 1);
        });

        taskModel.setProperty("/tasks", task_list);
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
      submitTimesheet: function () {

        var oCalendar = this.byId("weeklySelectorTimeSheet"); 
        var oStartDate = oCalendar.getStartDate();
        var iWeekNumber = this.getWeekNumber(oStartDate);
        console.log(iWeekNumber);

        let tableContainer = this.getView().byId("tableContainer");
        let model = this.getView().getModel();
        let allTimesheets = {};
        let isValid = true;

        tableContainer.getItems().forEach((item) => {
          if (item instanceof sap.m.Table) {
            let binding = item.getBinding("items");
            let contexts = binding.getCurrentContexts();

            contexts.forEach((context) => {
              let data = context.getObject();

              if (!data.time || data.time.trim() === "") {
                isValid = false;
                this.highlightInvalidField(
                  item,
                  context,
                  "time",
                  "Hours required"
                );
              } else if (!data.comments || data.comments.trim() === "") {
                isValid = false;
                this.highlightInvalidField(
                  item,
                  context,
                  "comments",
                  "Comments required"
                );
              } else if (parseFloat(data.time) > 12) {
                isValid = false;
                this.highlightInvalidField(
                  item,
                  context,
                  "time",
                  "Max 12 hours allowed"
                );
              }
            });
          }
        });

        if (!isValid) {
          sap.m.MessageToast.show("Please fill all required fields correctly");
          return;
        }

        tableContainer.getItems().forEach((item) => {
          if (item instanceof sap.m.Table) {
            let projectId = item.data("projectId");
            let binding = item.getBinding("items");
            allTimesheets[projectId] = binding
              .getCurrentContexts()
              .map((context) => {
                return context.getObject();
              });
          }
        });

        console.log(allTimesheets);

        this.resetTimesheetForm();

        MessageToast.show("Timesheet submitted successfully");

        let submittedTimesheetNo = this.getView()
          .byId("noSubmittedSheets")
          .getText();
        submittedTimesheetNo = parseInt(submittedTimesheetNo) + 1;
        this.getView()
          .byId("noSubmittedSheets")
          .setText(JSON.stringify(submittedTimesheetNo));
      },

      highlightInvalidField: function (table, context, fieldName, message) {
        let row = table
          .getItems()
          .find((item) => item.getBindingContext() === context);
        if (row) {
          let cells = row.getCells();
          let input = fieldName === "time" ? cells[0] : cells[1];
          input.setValueState(sap.ui.core.ValueState.Error);
          input.setValueStateText(message);
        }
      },

      resetTimesheetForm: function () {
        let tableContainer = this.getView().byId("tableContainer");
        let model = this.getView().getModel();

        tableContainer.removeAllItems();

        model.setProperty("/projects", {});

        this.getView().byId("timesheetSubmitButton").setVisible(false);
        this.getView().byId("projectComboBox").setSelectedKeys([]);
      },
      onInputChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var oBinding = oInput.getBinding("value");
        var newValue = oInput.getValue();
        oBinding.setValue(newValue);

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

      onAddRow: function () {
        let projComboBox = this.getView().byId("projectComboBox");
        let selectedKeys = projComboBox.getSelectedKeys();
        let selectedItems = projComboBox.getSelectedItems();
        let tableContainer = this.getView().byId("tableContainer");
        let model = this.getView().getModel();

        if (selectedKeys.length > 0) {
          if (!model.getProperty("/projects")) {
            model.setProperty("/projects", {});
          }

          for (let i = 0; i < selectedKeys.length; i++) {
            let projectId = selectedKeys[i];
            let projectName = selectedItems[i].getText();
            let projectPath = `/projects/${projectId}`;

            let existingTable = tableContainer
              .getItems()
              .find((item) => item.data("projectId") === projectId);

            if (!existingTable) {
              if (!model.getProperty(projectPath)) {
                let initialTimesheets = [];
                for (let j = 0; j < 5; j++) {
                  initialTimesheets.push({
                    time: "",
                    comments: "",
                  });
                }

                model.setProperty(projectPath, {
                  name: projectName,
                  timesheets: initialTimesheets,
                });
              }

              var projectHeader = new sap.m.VBox({
                items: [
                  new sap.m.Text({
                    text: projectName,
                    wrapping: false,
                  }),
                ],
              }).addStyleClass("sapUiSmallMarginTopBottom");

              var oTable = new sap.m.Table({
                columns: [
                  new sap.m.Column({
                    header: new sap.m.Text({ text: "Hours" }),
                  }),
                  new sap.m.Column({
                    header: new sap.m.Text({ text: "Comments" }),
                  }),
                ],
              }).data("projectId", projectId);

              var hoursInput = new sap.m.Input({
                value: "{time}",
                type: sap.m.InputType.Number,
                liveChange: function (oEvent) {
                  let input = oEvent.getSource();
                  let value = input.getValue();

                  // Allow only numbers and decimal point
                  if (!/^[0-9]*\.?[0-9]*$/.test(value)) {
                    input.setValueState(sap.ui.core.ValueState.Error);
                    input.setValueStateText("Numbers only (0-12)");
                    return;
                  }

                  // Validate max 12 hours
                  if (value && parseFloat(value) > 12) {
                    input.setValueState(sap.ui.core.ValueState.Error);
                    input.setValueStateText("Maximum 12 hours allowed");
                  } else {
                    input.setValueState(sap.ui.core.ValueState.None);
                  }
                },
                change: function (oEvent) {
                  let input = oEvent.getSource();
                  let value = input.getValue();

                  // Final validation
                  if (!value) return;

                  if (!/^[0-9]+\.?[0-9]*$/.test(value)) {
                    input.setValueState(sap.ui.core.ValueState.Error);
                    input.setValueStateText("Enter valid number");
                    return;
                  }

                  if (parseFloat(value) > 12) {
                    input.setValueState(sap.ui.core.ValueState.Error);
                    input.setValueStateText("Cannot exceed 12 hours");
                  } else {
                    input.setValueState(sap.ui.core.ValueState.None);
                  }
                },
              });

              oTable.bindItems({
                path: `${projectPath}/timesheets`,
                template: new sap.m.ColumnListItem({
                  cells: [
                    hoursInput,
                    new sap.m.Input({
                      value: "{comments}",
                    }),
                  ],
                }),
              });

              tableContainer.addItem(projectHeader);
              tableContainer.addItem(oTable);
            }
          }
          this.getView().byId("timesheetSubmitButton").setVisible(true);
        }
      },
      getWeekNumber(oDate) {
        // Create a clone to avoid modifying the original date
        var d = new Date(oDate.getTime());
        d.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        // January 4 is always in week 1
        var week1 = new Date(d.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1
        return (
          1 +
          Math.round(
            ((d.getTime() - week1.getTime()) / 86400000 -
              3 +
              ((week1.getDay() + 6) % 7)) /
              7
          )
        );
      },
    });
  }
);
