import { SubscriptionPlanRepository, UserSubscriptionRepository, UserRepository } from "../repositories";
import { BadRequestError } from "../errors/badRequest.error";
import { NotFoundError } from "../errors/notFound.error";
import { SubscriptionPlan, UserSubscription } from "../models/subscription";
import { User } from "../models/user";
import { sendEmail } from "../utils/emails";
import { processPayment } from "../utils/payment";
import { Status } from "../enums/status.enum";
import { addMonths, addYears } from "date-fns";

// Helper function to calculate end date based on duration
const calculateEndDate = (duration: string) => {
  const startDate = new Date();
  return duration === "monthly" 
    ? addMonths(startDate, 1)
    : addYears(startDate, 1);
};

// Get all subscription plans
const getPlans = async () => {
  try {
    const plans = await SubscriptionPlanRepository.find();
    return plans;
  } catch (error) {
    console.error("Error in getPlans service:", error);
    throw error;
  }
};

// Purchase a subscription
export const purchaseSubscription = async (
  userId: string,
  planId: string,
  paymentMethod: string,
  network?: string,
  to_currency?: string,
  transactionId?: string
) => {
  const user = await UserRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const plan = await SubscriptionPlanRepository.findOne({ where: { id: planId } });
  if (!plan) {
    throw new NotFoundError("Subscription plan not found");
  }

  let paymentDetails: any = {};
  
  if (paymentMethod === "crypto") {
    if (!network || !to_currency) {
      throw new BadRequestError("Network and to_currency are required for crypto payments");
    }
    
    const paymentResponse = await processPayment(
      Date.now(),
      plan.price,
      "USD",
      network,
      to_currency,
      `https://ggp-production-5e27.up.railway.app/v1/subscription/payment-callback`
    );

    paymentDetails = {
      paymentMethod,
      paymentStatus: paymentResponse.payment_status,
      paymentId: paymentResponse.uuid,
      paymentUrl: paymentResponse.url,
      paymentAddress: paymentResponse.address,
      paymentQrCode: paymentResponse.address_qr_code,
      paymentExpiresAt: paymentResponse.expired_at,
      paymentAmount: paymentResponse.payer_amount,
      paymentCurrency: paymentResponse.payer_currency,
    };
  } else if (paymentMethod === "payoneer") {
    if (!transactionId) {
      throw new BadRequestError("Transaction ID is required for Payoneer payments");
    }
    
    paymentDetails = {
      paymentMethod,
      paymentStatus: Status.paymentStatus.PENDING,
      paymentId: transactionId, // Store Payoneer transaction ID as paymentId
    };
  }

  const subscription = UserSubscriptionRepository.create({
    user: { id: userId } as User,
    plan: { id: planId } as SubscriptionPlan,
    startDate: new Date(),
    endDate: calculateEndDate(plan.duration),
    status: Status.paymentStatus.PENDING,
    paymentId: paymentDetails.paymentId,
    paymentStatus: paymentDetails.paymentStatus,
  });

  await UserSubscriptionRepository.save(subscription);

  return {
    subscription,
    paymentDetails: paymentMethod === "crypto" ? {
      url: paymentDetails.paymentUrl,
      address: paymentDetails.paymentAddress,
      qrCode: paymentDetails.paymentQrCode,
      expiresAt: paymentDetails.paymentExpiresAt,
      amount: paymentDetails.paymentAmount,
      currency: paymentDetails.paymentCurrency,
    } : {
      transactionId: paymentDetails.paymentId,
      status: paymentDetails.paymentStatus
    }
  };
};

// Get current subscription
const getCurrentSubscription = async (userId: string) => {
  try {
    const subscription = await UserSubscriptionRepository.findOne({
      where: {
        user: { id: userId },
        status: "active",
      },
      relations: ["plan"],
    });

    return subscription;
  } catch (error) {
    console.error("Error in getCurrentSubscription service:", error);
    throw error;
  }
};

// Cancel subscription
const cancelSubscription = async (userId: string) => {
  try {
    const subscription = await UserSubscriptionRepository.findOne({
      where: {
        user: { id: userId },
        status: "active",
      },
      relations: ["user", "plan"],
    });

    if (!subscription) {
      throw new NotFoundError("No active subscription found");
    }

    subscription.status = "cancelled";
    await UserSubscriptionRepository.save(subscription);

    // Send email notification
    await sendEmail({
      toEmail: subscription.user.email,
      subject: "Subscription Cancelled",
      text: `Your subscription to ${subscription.plan.name} has been cancelled.`,
    });

    return subscription;
  } catch (error) {
    console.error("Error in cancelSubscription service:", error);
    throw error;
  }
};

// Admin services
const createPlan = async (planData: Partial<SubscriptionPlan>) => {
  try {
    const plan = new SubscriptionPlan();
    Object.assign(plan, planData);
    
    const savedPlan = await SubscriptionPlanRepository.save(plan);
    return savedPlan;
  } catch (error) {
    console.error("Error in createPlan service:", error);
    throw error;
  }
};

const updatePlan = async (planId: string, updateData: Partial<SubscriptionPlan>) => {
  try {
    const plan = await SubscriptionPlanRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundError("Subscription plan not found");
    }

    Object.assign(plan, updateData);
    const updatedPlan = await SubscriptionPlanRepository.save(plan);
    return updatedPlan;
  } catch (error) {
    console.error("Error in updatePlan service:", error);
    throw error;
  }
};

const deletePlan = async (planId: string) => {
  try {
    const plan = await SubscriptionPlanRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundError("Subscription plan not found");
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await UserSubscriptionRepository.count({
      where: {
        plan: { id: planId },
        status: "active",
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestError("Cannot delete plan with active subscriptions");
    }

    await SubscriptionPlanRepository.delete(planId);
  } catch (error) {
    console.error("Error in deletePlan service:", error);
    throw error;
  }
};

// Add this function to create initial plans
const createInitialPlans = async () => {
  try {
    const plans: Array<{
      name: string;
      duration: "monthly" | "yearly";
      price: number;
      description: string;
    }> = [
      {
        name: "Basic Monthly",
        duration: "monthly",
        price: 29.99,
        description: "Basic plan with monthly billing"
      },
      {
        name: "Standard Monthly",
        duration: "monthly",
        price: 49.99,
        description: "Standard plan with monthly billing"
      },
      {
        name: "Premium Monthly",
        duration: "monthly",
        price: 99.99,
        description: "Premium plan with monthly billing"
      },
      {
        name: "Basic Yearly",
        duration: "yearly",
        price: 299.99,
        description: "Basic plan with yearly billing (2 months free)"
      },
      {
        name: "Standard Yearly",
        duration: "yearly",
        price: 499.99,
        description: "Standard plan with yearly billing (2 months free)"
      },
      {
        name: "Premium Yearly",
        duration: "yearly",
        price: 999.99,
        description: "Premium plan with yearly billing (2 months free)"
      }
    ];

    for (const planData of plans) {
      const existingPlan = await SubscriptionPlanRepository.findOne({
        where: {
          name: planData.name,
          duration: planData.duration
        }
      });

      if (!existingPlan) {
        const plan = new SubscriptionPlan();
        Object.assign(plan, planData);
        await SubscriptionPlanRepository.save(plan);
        console.log(`Created plan: ${planData.name}`);
      }
    }

    console.log("All subscription plans created successfully");
  } catch (error) {
    console.error("Error creating initial plans:", error);
    throw error;
  }
};

const getAllSubscribedUsers = async () => {
  // Fetch all subscriptions with user and plan details
  return await UserSubscriptionRepository.find({
    relations: ["user", "plan"],
    order: { createdAt: "DESC" },
  });
};

const getActiveSubscription = async (userId: string) => {
  return await UserSubscriptionRepository.findOne({
    where: {
      user: { id: userId },
      status: "active",
    },
    relations: ["plan"],
    order: { createdAt: "DESC" },
  });
};

export default {
  getPlans,
  purchaseSubscription,
  getCurrentSubscription,
  cancelSubscription,
  createPlan,
  updatePlan,
  deletePlan,
  createInitialPlans,
  getAllSubscribedUsers,
  getActiveSubscription,
}; 