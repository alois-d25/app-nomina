from datetime import date
from crud.base_crud import CRUDBase
from models.tasa_dolar_model import TasaDolar, TipoTasa, FuenteTasa
from schemas.tasa_dolar_schema import TasaDolarCreate, TasaDolarUpdate
from sqlalchemy.orm import Session


class CRUDTasaDolar(CRUDBase[TasaDolar, TasaDolarCreate, TasaDolarUpdate]):

    def get_ultimo_registro(self, db: Session) -> TasaDolar | None:
        """Retorna el registro más reciente de la tabla tasa_dolar."""
        return db.query(TasaDolar).order_by(TasaDolar.id.desc()).first()

    def get_tasa_personalizada_vigente(self, db: Session) -> float | None:
        """
        Si el último registro fue ingresado por el usuario (fuente='usuario'),
        retorna su valor. Si no, retorna None para indicar que se debe usar la API.
        """
        ultimo = self.get_ultimo_registro(db)
        if ultimo and ultimo.fuente == FuenteTasa.usuario:
            return float(ultimo.valor)
        return None

    def guardar_tasa_usada(
        self,
        db: Session,
        valor: float,
        fuente: FuenteTasa,
        tipo: TipoTasa = TipoTasa.BCV,
        usuario_id: int | None = None,
    ) -> TasaDolar:
        """
        Persiste la tasa utilizada en una operación (nómina, etc.) para mantener el histórico.
        Se llama cada vez que se crea una nómina.
        """
        tasa = TasaDolar(
            tipo=tipo,
            valor=valor,
            fecha=date.today(),
            fuente=fuente,
            usuario_id=usuario_id,
        )
        db.add(tasa)
        db.commit()
        db.refresh(tasa)
        return tasa


crud_tasa_dolar = CRUDTasaDolar(TasaDolar)
