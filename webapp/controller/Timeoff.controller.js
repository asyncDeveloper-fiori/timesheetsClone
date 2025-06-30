sap.ui.define(
  ["sap/ui/core/mvc/Controller", "../model/models"],
  (Controller, models) => {
    "use strict";

    return Controller.extend("timesheetsclone.controller.Timeoff", {
      onInit() {
        var timeoffData = JSON.parse(localStorage.timeoff);

          var oData = {};
          oData["toffData"] = [timeoffData];

          oData["toffData"].forEach((row, i) => {
            row["index"] = i + 1;
          });

          var oModel = models.directJSONModel(oData);

          this.getView().setModel(oModel);
      },

      onBackPress() {
        var router = this.getOwnerComponent().getRouter();
        router.navTo("RouteView2");
      },
    });
  }
);
