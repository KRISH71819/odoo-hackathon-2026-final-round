import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  Panel,
  Input,
  Select,
  PrimaryButton,
  NoticeStrip,
} from '../../components/ui.js';
import { api } from '../../lib/api.js';
import { useProducts, usePriceLists } from '../catalog/useCatalog.js';
import { useWarehouses } from '../fulfillment/useFulfillment.js';

export default function AdminConfigPage() {
  const { data: productsData } = useProducts();
  const { data: priceListsData, refetch: refetchPrices } = usePriceLists();
  const { data: warehousesData, refetch: refetchWarehouses } = useWarehouses();

  const [discounts, setDiscounts] = useState<any>({
    tierRules: [],
    categoryRules: [],
  });

  const [plans, setPlans] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const [warehouse, setWarehouse] = useState({
    name: '',
    code: '',
    shippingCostWeight: 1,
  });

  const [stock, setStock] = useState({
    warehouseId: '',
    productId: '',
    quantity: 0,
  });

  const [subscription, setSubscription] = useState({
    name: '',
    interval: 'MONTHLY',
    pricePerInterval: 0,
  });

  const [priceList, setPriceList] = useState({
    name: '',
    customerTier: 'BRONZE',
    currencyCode: 'USD',
  });

  const loadConfiguration = async () => {
    const [discountResponse, subscriptionResponse] = await Promise.all([
      api.get<any>('/discount-rules'),
      api.get<any>('/billing/subscription-plans'),
    ]);

    setDiscounts(
      discountResponse.data ?? {
        tierRules: [],
        categoryRules: [],
      },
    );

    setPlans(subscriptionResponse.data ?? []);
  };

  useEffect(() => {
    loadConfiguration().catch(() => {
      setMessage('Could not load configuration');
    });
  }, []);

  const saveDiscountRule = async (rule: any, isCategory: boolean) => {
    const endpoint = isCategory
      ? `/category-discount-rules/${rule.id}`
      : `/discount-rules/${rule.id}`;

    await api.put(endpoint, {
      maxDiscountBps: Number(rule.maxDiscountBps),
      description: rule.description ?? '',
    });

    await loadConfiguration();
    setMessage('Discount rule saved');
  };

  return (
    <div>
      <PageHeader
        title="Admin Configuration"
        subtitle="Configure pricing governance, warehouses, subscriptions and price lists"
      />

      {message && (
        <NoticeStrip variant="info" className="mb-4">
          {message}
        </NoticeStrip>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Panel title="Discount Governance">
          <div className="space-y-3">
            {(discounts.tierRules ?? []).map((rule: any) => (
              <div
                key={rule.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end"
              >
                <div className="text-xs text-df-text">
                  Customer Tier: {rule.customerTier}
                </div>

                <Input
                  label="Max discount (bps)"
                  type="number"
                  value={rule.maxDiscountBps}
                  onChange={(event) =>
                    setDiscounts((current: any) => ({
                      ...current,
                      tierRules: current.tierRules.map((item: any) =>
                        item.id === rule.id
                          ? {
                              ...item,
                              maxDiscountBps: Number(event.target.value),
                            }
                          : item,
                      ),
                    }))
                  }
                />

                <PrimaryButton
                  onClick={() => saveDiscountRule(rule, false)}
                >
                  Save
                </PrimaryButton>
              </div>
            ))}

            {(discounts.categoryRules ?? []).map((rule: any) => (
              <div
                key={rule.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end"
              >
                <div className="text-xs text-df-text">
                  Category: {rule.category}
                </div>

                <Input
                  label="Max discount (bps)"
                  type="number"
                  value={rule.maxDiscountBps}
                  onChange={(event) =>
                    setDiscounts((current: any) => ({
                      ...current,
                      categoryRules: current.categoryRules.map((item: any) =>
                        item.id === rule.id
                          ? {
                              ...item,
                              maxDiscountBps: Number(event.target.value),
                            }
                          : item,
                      ),
                    }))
                  }
                />

                <PrimaryButton
                  onClick={() => saveDiscountRule(rule, true)}
                >
                  Save
                </PrimaryButton>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Warehouses & Stock">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              label="Warehouse Name"
              value={warehouse.name}
              onChange={(event) =>
                setWarehouse({
                  ...warehouse,
                  name: event.target.value,
                })
              }
            />

            <Input
              label="Code"
              value={warehouse.code}
              onChange={(event) =>
                setWarehouse({
                  ...warehouse,
                  code: event.target.value,
                })
              }
            />

            <Input
              label="Shipping Weight"
              type="number"
              value={warehouse.shippingCostWeight}
              onChange={(event) =>
                setWarehouse({
                  ...warehouse,
                  shippingCostWeight: Number(event.target.value),
                })
              }
            />
          </div>

          <PrimaryButton
            className="mt-3"
            disabled={!warehouse.name || !warehouse.code}
            onClick={async () => {
              await api.post('/fulfillment/warehouses', warehouse);

              setWarehouse({
                name: '',
                code: '',
                shippingCostWeight: 1,
              });

              await refetchWarehouses();
              setMessage('Warehouse created');
            }}
          >
            Add Warehouse
          </PrimaryButton>

          <div className="border-t border-df-border my-4" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              label="Warehouse"
              value={stock.warehouseId}
              onChange={(event) =>
                setStock({
                  ...stock,
                  warehouseId: event.target.value,
                })
              }
            >
              <option value="">Select warehouse</option>

              {(warehousesData?.data ?? []).map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <Select
              label="Product"
              value={stock.productId}
              onChange={(event) =>
                setStock({
                  ...stock,
                  productId: event.target.value,
                })
              }
            >
              <option value="">Select product</option>

              {(productsData?.data ?? []).map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <Input
              label="Quantity"
              type="number"
              min="0"
              value={stock.quantity}
              onChange={(event) =>
                setStock({
                  ...stock,
                  quantity: Number(event.target.value),
                })
              }
            />
          </div>

          <PrimaryButton
            className="mt-3"
            disabled={!stock.warehouseId || !stock.productId}
            onClick={async () => {
              await api.put(
                `/fulfillment/warehouses/${stock.warehouseId}/stock`,
                {
                  productId: stock.productId,
                  quantity: stock.quantity,
                },
              );

              await refetchWarehouses();
              setMessage('Warehouse stock updated');
            }}
          >
            Set Stock
          </PrimaryButton>
        </Panel>

        <Panel title="Subscription Plans">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              label="Plan Name"
              value={subscription.name}
              onChange={(event) =>
                setSubscription({
                  ...subscription,
                  name: event.target.value,
                })
              }
            />

            <Select
              label="Interval"
              value={subscription.interval}
              onChange={(event) =>
                setSubscription({
                  ...subscription,
                  interval: event.target.value,
                })
              }
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </Select>

            <Input
              label="Price (cents)"
              type="number"
              min="0"
              value={subscription.pricePerInterval}
              onChange={(event) =>
                setSubscription({
                  ...subscription,
                  pricePerInterval: Number(event.target.value),
                })
              }
            />
          </div>

          <PrimaryButton
            className="mt-3"
            disabled={!subscription.name}
            onClick={async () => {
              await api.post('/billing/subscription-plans', {
                ...subscription,
                prorationRule: 'DAY_BASED',
                cancellationPolicy: 'IMMEDIATE',
              });

              setSubscription({
                name: '',
                interval: 'MONTHLY',
                pricePerInterval: 0,
              });

              await loadConfiguration();
              setMessage('Subscription plan created');
            }}
          >
            Add Plan
          </PrimaryButton>

          <div className="mt-3 space-y-1 text-xs text-df-text-muted">
            {plans.map((plan) => (
              <div key={plan.id}>
                {plan.name} · {plan.interval}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Price Lists">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              label="Name"
              value={priceList.name}
              onChange={(event) =>
                setPriceList({
                  ...priceList,
                  name: event.target.value,
                })
              }
            />

            <Select
              label="Customer Tier"
              value={priceList.customerTier}
              onChange={(event) =>
                setPriceList({
                  ...priceList,
                  customerTier: event.target.value,
                })
              }
            >
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
            </Select>

            <Input
              label="Currency"
              maxLength={3}
              value={priceList.currencyCode}
              onChange={(event) =>
                setPriceList({
                  ...priceList,
                  currencyCode: event.target.value
                    .toUpperCase()
                    .slice(0, 3),
                })
              }
            />
          </div>

          <PrimaryButton
            className="mt-3"
            disabled={!priceList.name}
            onClick={async () => {
              await api.post('/price-lists', {
                ...priceList,
                isActive: true,
              });

              setPriceList({
                name: '',
                customerTier: 'BRONZE',
                currencyCode: 'USD',
              });

              await refetchPrices();
              setMessage('Price list created');
            }}
          >
            Add Price List
          </PrimaryButton>

          <div className="mt-3 space-y-1 text-xs text-df-text-muted">
            {(priceListsData?.data ?? []).map((item: any) => (
              <div key={item.id}>
                {item.name} · {item.customerTier} ·{' '}
                {item.currencyCode ?? item.currency ?? 'USD'}
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
