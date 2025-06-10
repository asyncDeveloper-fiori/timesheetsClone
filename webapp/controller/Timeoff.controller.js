sap.ui.define(["sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel"
], (Controller,JSONModel) => {
  "use strict";

  return Controller.extend("timesheetsclone.controller.Timeoff", {
    onInit() {
        var data = JSON.parse(localStorage.timeoff);

        var oModel = new JSONModel();
        oModel.setData({
            timeoff : data,
        })

        this.getView.setModel(oModel);
        var oSmartTable = this.getView().byId("smatTableTimeOff");
        oSmartTable.setEntitySet("Timeoff");
        oSmartTable.setModel(oModel);
        oSmartTable.bindRows('/timeoff');
    },
  });
});
