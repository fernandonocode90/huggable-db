INSERT INTO public.subscribers (user_id, email, provider, plan, status, stripe_customer_id, stripe_subscription_id, trial_end, current_period_end, cancel_at_period_end)
VALUES ('0452f9f4-5e47-43c6-b958-177329f9ddca', 'rapiddelivery.fero@gmail.com', 'stripe', 'annual', 'trialing', 'cus_UPTG4tBBreIgFv', 'sub_1TQiW32dkJ1qD1DrPI0pjQIh', to_timestamp(1777875575), to_timestamp(1777875575), false)
ON CONFLICT (user_id) DO UPDATE
  SET provider=EXCLUDED.provider, plan=EXCLUDED.plan, status=EXCLUDED.status,
      stripe_customer_id=EXCLUDED.stripe_customer_id,
      stripe_subscription_id=EXCLUDED.stripe_subscription_id,
      trial_end=EXCLUDED.trial_end, current_period_end=EXCLUDED.current_period_end,
      cancel_at_period_end=EXCLUDED.cancel_at_period_end, updated_at=now();