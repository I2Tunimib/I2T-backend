#!/usr/bin/env python

import sys
import json
import pandas as pd
from column_classifier import ColumnClassifier

#from column_classifier
# 'DATE': 'DATE', 'TIME': 'DATE',
# 'MONEY': 'NUMBER', 'PERCENT': 'NUMBER', 'QUANTITY': 'NUMBER', 'CARDINAL': 'NUMBER', 'ORDINAL': 'NUMBER',
# 'GPE': 'LOCATION', 'LOC': 'LOCATION',
# 'ORG': 'ORGANIZATION',
# 'PERSON': 'PERSON',
# 'WORK_OF_ART': 'OTHER', 'EVENT': 'OTHER', 'FAC': 'OTHER', 'PRODUCT': 'OTHER','LAW': 'OTHER', 'NORP': 'OTHER', 'LANGUAGE': 'OTHER'

#from column_classifier
ENTITY_TYPES = { "PERSON", "LOCATION", "ORGANIZATION", "OTHER" }
LITERAL_TYPES = { "NUMBER", "DATE", "STRING" }


def main():
    input_data = json.load(sys.stdin)
    df = pd.DataFrame(input_data["columns"])

    classifier = ColumnClassifier(model_type="fast")
    results_list = classifier.classify_multiple_tables([df])
    predictions = results_list[0]["table_1"]

    ner_classification = {}
    kind_classification = {}

    for col, info in predictions.items():
        if "classification" in info:
            ner = info["classification"]
        elif "classifications" in info:
            ner = max(info["classifications"], key=info["classifications"].get)
        else:
            ner = "unknown"

        ner_classification[col] = ner

        if ner in ENTITY_TYPES:
            kind_classification[col] = "entity"
        elif ner in LITERAL_TYPES:
            kind_classification[col] = "literal"
        else:
            kind_classification[col] = "unknown"

    output = {"ner_classification": ner_classification, "kind_classification": kind_classification}
    print(json.dumps(output))

if __name__ == "__main__":
    main()
