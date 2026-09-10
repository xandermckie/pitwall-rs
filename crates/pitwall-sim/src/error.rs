use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SimError {
    #[error("{0}")]
    InvalidConfig(String),
}

impl Serialize for SimError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
