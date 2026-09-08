const express = require("express");
const router = express.Router();
const assetMasterController = require("../../controllers/Employee/Asset");
const uploadImage = require("../../middlewares/uploadImage");

router.post( "/getAsset", assetMasterController.getAsset );
router.post( "/getAssetById", assetMasterController.getAssetById );
router.post( "/getAssetHelp", assetMasterController.getAssetHelp );

router.post(
    "/addEditAsset",

    uploadImage("assets", "asset").fields([
        {
            name: "assetImage",
            maxCount: 1,
        },
        {
            name: "purchaseInvoice",
            maxCount: 1,
        },
        {
            name: "warrantyDocument",
            maxCount: 1,
        },
        {
            name: "otherDocument",
            maxCount: 1,
        },
    ]),

    assetMasterController.addEditAsset
);

router.post( "/deleteAssetById", assetMasterController.deleteAssetById );

module.exports = router;