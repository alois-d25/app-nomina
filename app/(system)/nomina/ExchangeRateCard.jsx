import { ExchangeRateService } from "@/services/exchangeRate.service";
import React, { useEffect, useState } from "react";
import { BsCurrencyExchange } from "react-icons/bs";

const ExchangeRateCard = ({ exchangeRate, usedExchangeRate }) => {

  return (
    <div className="col-span-1 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-4">
          <BsCurrencyExchange />
          Tasa de Cambio Referencial
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-surface-container p-3 rounded-lg border border-outline-variant/50">
            <span className="font-body-md text-body-md text-on-surface-variant">
              BCV (Oficial)
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {exchangeRate} Bs/USD
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Tasa a aplicar en este período por el sistema
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 mt-2 text-black font-bold">
                Bs. {usedExchangeRate === null ? exchangeRate : usedExchangeRate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateCard;
