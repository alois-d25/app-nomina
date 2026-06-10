import React, { useEffect, useState } from "react";
import { BsCurrencyExchange } from "react-icons/bs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ExchangeRateCard = () => {
  const [tasaInfo, setTasaInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasa = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/tasa_dolar/actual`);
        setTasaInfo(res.data);
      } catch {
        setTasaInfo(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTasa();
  }, []);

  const valor = tasaInfo?.valor;
  const fuente = tasaInfo?.fuente;
  const etiquetaFuente = fuente === "usuario" ? "Personalizada" : "BCV API";
  const colorFuente = fuente === "usuario" ? "text-warning" : "text-primary";

  return (
    <div className="col-span-1 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-4">
          <BsCurrencyExchange />
          Tasa de Cambio Vigente
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-16">
            <span className="loading loading-spinner loading-sm text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center bg-surface-container p-3 rounded-lg border border-outline-variant/50">
              <div className="flex flex-col">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Tasa a aplicar en la nómina
                </span>
                <span className={`font-label-sm text-label-sm ${colorFuente}`}>
                  Fuente: {etiquetaFuente}
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {valor != null ? `${Number(valor).toFixed(2)} Bs/USD` : "—"}
              </span>
            </div>

            {fuente === "usuario" && (
              <div className="alert alert-warning py-2 text-xs">
                Se está usando una tasa personalizada. Se aplicará hasta que se registre una nueva o se vuelva a la API.
              </div>
            )}
            {fuente === "api" && (
              <div className="alert alert-info py-2 text-xs">
                Tasa actualizada en tiempo real desde la API BCV.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExchangeRateCard;
