import logging


logger = logging.getLogger("cataclub")

logger.setLevel(logging.INFO)


console_handler = logging.StreamHandler()


formatter = logging.Formatter(
    fmt="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


console_handler.setFormatter(formatter)


if not logger.handlers:
    logger.addHandler(console_handler)