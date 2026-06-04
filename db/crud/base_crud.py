from typing import Any, Generic, TypeVar, Type
from sqlalchemy.orm import Session

# tipos genericos para modelos y esquemas. Le sirve a Pythono para saber exactamente qué tipo de objeto está entrando y saliendo de las funciones
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any) -> ModelType | None:
        return db.get(self.model, id)

    def get_all(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: CreateSchemaType) -> ModelType:
        # transfor el esquema (JSON) en un modelo de sqlalchemy
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ModelType, obj_in: UpdateSchemaType) -> ModelType:
        # objeto de la base de datos a  diccionario
        obj_data = {column.name: getattr(db_obj, column.name) for column in db_obj.__table__.columns}
        
        # datos que enviaron en el request (ignorando los que no enviaron)
        update_data = obj_in.model_dump(exclude_unset=True)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: Any) -> ModelType:
        # Buscamos el registro asumiendo que la llave primaria se llama 'cedula' o 'id'
        obj = db.get(self.model, id)
        db.delete(obj)
        db.commit()
        return obj