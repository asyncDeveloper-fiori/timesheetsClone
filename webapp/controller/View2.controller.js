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
    "sap/ui/layout/form/SimpleForm",
    "sap/m/Label",
    "sap/m/Input",
  ],
  (
    Controller,
    JSONModel,
    MessageToast,
    CalendarType,
    DateRange,
    library,
    DateFormat,
    Table,
    SimpleForm,
    Label,
    Input
  ) => {
    "use strict";

    return Controller.extend("timesheetsclone.controller.View2", {
      oFormatYyyymmdd: null,

      onInit() {
        // for timesheet week selector
        const oWeekModel = new JSONModel({
          startDate: null,
          endDate: null,
          weekNumber: null,
          currentDate: new Date(), // Used as reference
        });
        this.getView().setModel(oWeekModel, "weekModel");

        // Calculate initial week
        this._calculateWeekDates();

        var user_model = this.getOwnerComponent().getModel("active_user");
        this.getView().setModel(user_model, "active_user");
        this.Dialog = this.byId("create_task_dialog");

        // sidebar user dialog
        this.userDialog = this.byId("userDialog");
        this.notificationDialog = this.byId("notificationDialog");
        this.reportDialog = this.byId("reportsDialog");

        var task_model = new JSONModel("model/tasks.json");
        this.getView().setModel(task_model);

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
        let tableContainer = this.getView().byId("tableContainer");
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

        let allTimesheets = {};
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

        console.log("Submitted Timesheets:", allTimesheets);

        this.disableTimesheetEditing();

        sap.m.MessageToast.show("Timesheet submitted successfully");

        let timeSheetNumber = this.getView()
          .byId("noSubmittedSheets")
          .getText();
        timeSheetNumber = parseInt(timeSheetNumber) + 1;
        this.getView()
          .byId("noSubmittedSheets")
          .setText(JSON.stringify(timeSheetNumber));
        this.getView().byId("rowButton").setVisible(false);
        this.getView().byId("timesheetSubmitButton").setVisible(false);
        this.getView().byId("idTimesheetTable").setVisible(false);
      },

      disableTimesheetEditing: function () {
        let tableContainer = this.getView().byId("tableContainer");

        tableContainer.getItems().forEach((item) => {
          if (item instanceof sap.m.Table) {
            let aItems = item.getItems();

            aItems.forEach((oItem) => {
              let aCells = oItem.getCells();

              // Hours input (first cell)
              aCells[0].setEditable(false);
              aCells[0].addStyleClass("submitted-field");

              // Comments input (second cell)
              aCells[1].setEditable(false);
              aCells[1].addStyleClass("submitted-field");
            });
          }
        });

        this.getView().byId("timesheetSubmitButton").setVisible(false);

        this.getView().byId("projectComboBox").setSelectedKeys([]);
      },

      resetTimesheetForm: function () {
        let tableContainer = this.getView().byId("tableContainer");

        tableContainer.removeAllItems();

        this.getView().getModel().setProperty("/projects", {});

        this.getView().byId("timesheetSubmitButton").setVisible(false);

        this.getView().byId("projectComboBox").setSelectedKeys([]);
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
        console.log(oCalendar.getParameters("weekNumber"));
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

                  if (!/^[0-9]*\.?[0-9]*$/.test(value)) {
                    input.setValueState(sap.ui.core.ValueState.Error);
                    input.setValueStateText("Numbers only (0-12)");
                    return;
                  }

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
        var d = new Date(oDate.getTime());
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        var week1 = new Date(d.getFullYear(), 0, 4);
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

      generateDynamicForm() {
        let projComboBox = this.getView().byId("projectComboBox");
        var selectedKeys = projComboBox.getSelectedKeys();
        let oContainer = this.getView().byId("tableContainer");
        let flag = -1;
        // oContainer.destroyContent();
        // console.log(selectedKeys);
        let presentIds = [];
        for (let i = 0;i < this.getView().byId("tableContainer").getItems().length;i++
        ) {
          presentIds.push(
            this.getView().byId("tableContainer").getItems()[i].sId
          );
        }

        for (let i = 0; i < selectedKeys.length; i++) {
          if (presentIds.indexOf(selectedKeys[i]) !== -1) {
            continue;
          } else {
            var oForm = new SimpleForm({
              id: selectedKeys[i],
              layout: "GridLayout",
              editable: true,
            });

            oForm.addContent(
              new sap.m.Label({
                text: selectedKeys[i],
                design: sap.m.LabelDesign.Bold,
              })
            );

            this.addFormFields(oForm, selectedKeys[i]);
            oContainer.addItem(oForm);
            flag = 1;
          }
        }
        if (flag === 1) {
          this.getView().byId("timesheetSubmitButton").setVisible(true);
        }
      },

      addFormFields(oForm, sKey) {
        for (let i = 0; i < 5; i++) {
          let oControl = new Input({
            id: sKey + i,
            placeholder: "Input hours",
            type: "Number",
            width: "100px",
            liveChange: this.validateHours.bind(this),
            // showSuggestion: true,
            // showClearButton: true, // Optional clear button
            // suffix: new sap.m.Button({
            //   // 'suffix' is the correct property
            //   icon: "sap-icon://search",
            //   press: function () {
            //     /* search logic */
            //   },
            // }),
          });

          oForm.addContent(oControl);
        }

        let buttonControl = new sap.m.Button({
          id: sKey+"delete",
          icon : "sap-icon://delete",
          type : "Reject",
          width:"2%",
          press : function(sKey){
            const oContainer = this.getView().byId('tableContainer');
            const aItems = oContainer.getItems();

            const idx =  aItems.find(item => item.getId() === sKey);

            if(idx){
              const oRemovedForm = aItems[idx];
              oContainer.removeItem(oRemovedForm);
              oRemovedForm.destroy();
              
              if (oContainer.getItems().length === 0) {
                  this.getView().byId('timesheetSubmitButton').setVisible(false);
              }
              return true;
            }
            return false;
          }.bind(this)
        })

        oForm.addContent(buttonControl);
      },

      validateHours: function (oEvent) {
        const input = oEvent.getSource();
        const value = parseInt(input.getValue());

        if (isNaN(value)) {
          input.setValueState("Error");
          input.setValueStateText("Please enter a valid number");
          return;
        }

        if (value > 12) {
          input.setValueState("Error");
          input.setValueStateText("Hours cannot exceed 12");
          input.setValue(12);
        } else if (value < 0) {
          input.setValueState("Error");
          input.setValueStateText("Hours cannot be negative");
          input.setValue(0);
        } else {
          input.setValueState("None");
        }
      },

      collectTimesheetData: function () {
        const weekNumber = this.getView()
          .byId("weekNumberText")
          .getText()
          .substr(6, 2);
        const oContainer = this.getView().byId("tableContainer");
        const aForms = oContainer.getItems();
        const aPayload = [];

        // Iterate through each form
        aForms.forEach((oForm) => {
          const sProjectId = oForm.getId();
          const aInputs = [];
          let bHasData = false;

          try {
            // Find all input fields in this form
            for (let i = 0; i < 5; i++) {
              const oInput = sap.ui.getCore().byId(`${sProjectId}${i}`);

              // Skip if input doesn't exist
              if (!oInput) {
                console.warn(`Input ${sProjectId}${i} not found`);
                aInputs.push({
                  day: i + 1,
                  hours: "0",
                });
                continue;
              }

              const sValue = oInput.getValue();

              if (sValue && sValue !== "0") {
                bHasData = true;
              }

              aInputs.push({
                day: i + 1,
                hours: sValue || "0",
              });
            }

            // Only include projects with actual data
            if (bHasData) {
              const oLabel = oForm.getContent()[0];
              aPayload.push({
                projectId: sProjectId,
                projectName: oLabel ? oLabel.getText() : "Unknown Project",
                days: aInputs,
                week: weekNumber,
                total: aInputs.reduce(
                  (sum, day) => sum + parseInt(day.hours),
                  0
                ),
              });
            }
          } catch (error) {
            console.error(`Error processing form ${sProjectId}:`, error);
          }
        });

        console.log("Timesheet Payload:", JSON.stringify(aPayload, null, 2));
        return aPayload;
      },
      onSubmit: function () {
        // console.log(this.getView().byId('weekNumberText').getText());
        const weekNumber = this.getView()
          .byId("weekNumberText")
          .getText()
          .substr(6, 2);
        const payload = this.collectTimesheetData();
        if (payload.length > 0) {
          // submit to backend or in this case set to local storage
          localStorage.setItem(weekNumber, JSON.stringify(payload));
          MessageToast.show("Submitted succesfully");
        } else {
          sap.m.MessageToast.show("No timesheet data to submit");
        }
        
      },

      onPreviousWeek: function () {
        const oModel = this.getView().getModel("weekModel");
        const oData = oModel.getData();

        // Subtract 7 days from current reference date
        const newDate = new Date(oData.currentDate);
        newDate.setDate(newDate.getDate() - 7);

        oModel.setProperty("/currentDate", newDate);
        this._calculateWeekDates();

        // Fire custom event
        this.getView().fireEvent("weekChanged", {
          startDate: oModel.getProperty("/startDate"),
          endDate: oModel.getProperty("/endDate"),
          weekNumber: oModel.getProperty("/weekNumber"),
        });
      },

      onNextWeek: function () {
        const oModel = this.getView().getModel("weekModel");
        const oData = oModel.getData();

        // Add 7 days to current reference date
        const newDate = new Date(oData.currentDate);
        newDate.setDate(newDate.getDate() + 7);

        oModel.setProperty("/currentDate", newDate);
        this._calculateWeekDates();

        // Fire custom event
        this.getView().fireEvent("weekChanged", {
          startDate: oModel.getProperty("/startDate"),
          endDate: oModel.getProperty("/endDate"),
          weekNumber: oModel.getProperty("/weekNumber"),
        });
      },

      _calculateWeekDates: function () {
        const oModel = this.getView().getModel("weekModel");
        const oData = oModel.getData();
        const oDate = new Date(oData.currentDate);

        // Calculate start of week (Monday)
        const day = oDate.getDay();
        const diff = oDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const startDate = new Date(oDate.setDate(diff));

        // Calculate end of week (Sunday)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        // Calculate ISO week number
        const weekNumber = this._getWeekNumber(startDate);

        // Update model
        oModel.setData({
          startDate: startDate,
          endDate: endDate,
          weekNumber: weekNumber,
          currentDate: oData.currentDate,
        });
      },

      _getWeekNumber: function (date) {
        // Create a copy of the date
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        // Set to nearest Thursday (current week will be the ISO week)
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));

        // Get first day of year
        const yearStart = new Date(d.getFullYear(), 0, 1);

        // Calculate full weeks to nearest Thursday
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

        return weekNo;
      },

      // Public method to set specific date
      setCurrentDate: function (oDate) {
        const oModel = this.getView().getModel("weekModel");
        oModel.setProperty("/currentDate", oDate);
        this._calculateWeekDates();
      },
    });
  }
);
