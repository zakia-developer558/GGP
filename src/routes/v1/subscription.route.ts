import { Router } from "express";
import subscriptionController from "../../controllers/subscription.controller";
import { authenticateJWT, authenticateCryptomus } from "../../middlewares/auth.middleware";
import { Others } from "../../enums/others.enum";
import { authorizeRole } from "../../middlewares/role.middleware";

const subscriptionRouter = Router();

// Get all subscription plans
subscriptionRouter.get("/plans", subscriptionController.getPlans);

// Purchase a subscription
subscriptionRouter.post("/purchase", authenticateJWT, subscriptionController.purchaseSubscription);

// Get user's current subscription
subscriptionRouter.get("/current", authenticateJWT, subscriptionController.getCurrentSubscription);

// Cancel subscription
subscriptionRouter.post("/cancel", authenticateJWT, subscriptionController.cancelSubscription);

// Admin routes
subscriptionRouter.post("/create-plan", authenticateJWT, authorizeRole(Others.role.MODERATOR), subscriptionController.createPlan);
subscriptionRouter.put("/update-plan/:planId", authenticateJWT, authorizeRole(Others.role.ADMIN), subscriptionController.updatePlan);
subscriptionRouter.delete("/delete-plan/:planId", authenticateJWT, authorizeRole(Others.role.ADMIN), subscriptionController.deletePlan);

// Payment callback route
subscriptionRouter.post("/payment-callback", authenticateCryptomus, subscriptionController.handlePaymentCallback);

export default subscriptionRouter; 