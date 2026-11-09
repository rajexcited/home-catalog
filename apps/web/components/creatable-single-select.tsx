"use client";

import { useEffect, useMemo, useState } from "react";
import CreatableSelect from "react-select/creatable";

type Option = {
  label: string;
  value: string;
};

type Props = {
  name: string;
  options: string[] | Option[];
  placeholder?: string;
  defaultValue?: string | Option | string[] | Option[];
  required?: boolean;
  isMulti?: boolean;
  delimiter?: string;
};

const toOption = (value: string | Option): Option => (typeof value === "string" ? { label: value, value } : value);

const findDefaultOption = (defaultValue: string | Option | undefined, options: Option[]): Option | null => {
  if (!defaultValue) return null;
  const defaultOption = toOption(defaultValue);
  const foundValueOption = options.find((opt) => opt.value === defaultOption.value);
  if (foundValueOption) {
    return foundValueOption;
  }
  const foundLabelOption = options.find((opt) => opt.label === defaultOption.label);
  if (foundLabelOption) {
    return foundLabelOption;
  }
  return null;
};

const findDefaultOptions = (defaultValue: string[] | Option[] | undefined, options: Option[]): Option[] => {
  if (!defaultValue || defaultValue.length === 0) {
    return [];
  }

  return defaultValue
    .map((value) => {
      const optionValue = toOption(value);
      return options.find((opt) => opt.value === optionValue.value) ?? options.find((opt) => opt.label === optionValue.label) ?? optionValue;
    })
    .filter(Boolean);
};

export function CreatableSingleSelect({ name, options, placeholder, defaultValue = "", required = false, isMulti = false, delimiter = "," }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // console.log("defaultValue:", defaultValue);
  // console.log("props options:", options);
  // console.log("isMulti:", isMulti);
  // console.log("isMounted:", isMounted);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const initialOptions = useMemo(() => {
    const filtered = options.filter(Boolean).map(toOption);
    const uniqueOptionMap = filtered.reduce(
      (acc, curr) => {
        acc[curr.label.toLowerCase()] = curr;
        return acc;
      },
      {} as Record<string, Option>
    );
    return Object.keys(uniqueOptionMap)
      .sort()
      .map((key) => uniqueOptionMap[key]);
  }, [options]);

  const [customOptions, setCustomOptions] = useState<Option[]>([]);
  const [selectedSingle, setSelectedSingle] = useState<Option | null>(
    !isMulti && !Array.isArray(defaultValue) ? findDefaultOption(defaultValue, initialOptions) : null
  );
  const [selectedMulti, setSelectedMulti] = useState<Option[]>(isMulti && Array.isArray(defaultValue) ? findDefaultOptions(defaultValue, initialOptions) : []);
  const [inputValue, setInputValue] = useState("");

  const mergedOptions = useMemo(() => {
    const seen = new Set<string>();
    const all = [...initialOptions, ...customOptions];
    return all.filter((opt) => {
      const key = opt.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [initialOptions, customOptions]);

  const selectOrCreateValue = (rawValue: string) => {
    const finalValue = rawValue.trim();
    if (!finalValue) return;

    const existing = mergedOptions.find((opt) => opt.label.toLowerCase() === finalValue.toLowerCase());
    const next = existing ?? toOption(finalValue);

    if (!existing) {
      setCustomOptions((prev) => [...prev, next]);
    }

    if (isMulti) {
      setSelectedMulti((prev) => {
        const alreadySelected = prev.some((opt) => opt.value.toLowerCase() === next.value.toLowerCase());
        if (alreadySelected) {
          return prev;
        }
        return [...prev, next];
      });
      return;
    }

    setSelectedSingle(next);
  };

  const commitInput = () => {
    const finalValue = inputValue.trim();
    if (!finalValue) return;

    selectOrCreateValue(finalValue);
    setInputValue("");
  };

  return (
    <>
      <input
        id={`validation-input-${name}`}
        type="text"
        style={{ position: "absolute", outline: "none", paddingLeft: "1rem", minHeight: "2.5rem", fontSize: "0rem" }}
        required={required}
        defaultValue={isMulti ? selectedMulti.map((opt) => opt.value).join(",") : (selectedSingle?.value ?? "")}
      />
      {isMulti ? (
        selectedMulti.map((selectedOption) => (
          <input key={`hidden-input-${name}-${selectedOption.value}`} type="hidden" name={name} value={selectedOption.value} />
        ))
      ) : (
        <input key={`hidden-input-${name}`} type="hidden" name={name} value={selectedSingle?.value ?? ""} />
      )}
      {!isMounted ? null : (
        <CreatableSelect
          key={`creatable-select-${name}`}
          instanceId={name}
          isMulti={isMulti}
          isClearable
          options={mergedOptions}
          value={isMulti ? selectedMulti : selectedSingle}
          inputValue={inputValue}
          onInputChange={(value, meta) => {
            if (meta.action !== "input-change") return;

            if (isMulti && delimiter && value.includes(delimiter)) {
              const segments = value.split(delimiter);
              const remainder = segments.pop() ?? "";
              segments.forEach((segment) => {
                if (segment.trim()) {
                  selectOrCreateValue(segment);
                }
              });
              setInputValue(remainder);
              return;
            }

            setInputValue(value);
          }}
          onFocus={() => {
            if (!isMulti && selectedSingle && !inputValue) {
              setInputValue(selectedSingle.label);
              setSelectedSingle(null);
            }
          }}
          onChange={(option) => {
            if (isMulti) {
              setSelectedMulti((option as Option[] | null) ?? []);
            } else {
              setSelectedSingle((option as Option | null) ?? null);
            }
            setInputValue("");
          }}
          onCreateOption={(value) => {
            selectOrCreateValue(value);
            setInputValue("");
          }}
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => {
            setIsMenuOpen(false);
            if (inputValue.trim()) {
              commitInput();
            }
          }}
          onBlur={() => {
            if (!isMenuOpen && inputValue.trim()) {
              commitInput();
            }
          }}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === "Tab") && inputValue.trim()) {
              commitInput();
            }
          }}
          placeholder={placeholder}
          noOptionsMessage={() => "Type to create"}
          formatCreateLabel={(value) => `Use \"${value}\"`}
          styles={{
            control: (base, state) => ({
              ...base,
              minHeight: 40,
              borderRadius: 10,
              borderColor: state.isFocused ? "#94a3b8" : "#e2e8f0",
              backgroundColor: "#f8fafc",
              boxShadow: "none",
              ":hover": { borderColor: "#cbd5e1" }
            }),
            valueContainer: (base) => ({ ...base, paddingLeft: 10, paddingRight: 6 }),
            input: (base) => ({ ...base, margin: 0, padding: 0 }),
            placeholder: (base) => ({ ...base, color: "#64748b" }),
            singleValue: (base) => ({ ...base, color: "#0f172a" }),
            indicatorSeparator: () => ({ display: "none" }),
            dropdownIndicator: (base, state) => ({
              ...base,
              color: state.isFocused ? "#334155" : "#94a3b8",
              padding: 6
            }),
            clearIndicator: (base) => ({ ...base, color: "#94a3b8", padding: 6 }),
            menu: (base) => ({
              ...base,
              zIndex: 40,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 22px rgba(15, 23, 42, 0.14)",
              overflow: "hidden"
            }),
            menuList: (base) => ({ ...base, paddingTop: 4, paddingBottom: 4 }),
            option: (base, state) => ({
              ...base,
              fontSize: "0.84rem",
              backgroundColor: state.isSelected ? "#dbeafe" : state.isFocused ? "#eff6ff" : "#ffffff",
              color: state.isSelected ? "#1d4ed8" : "#0f172a",
              cursor: "pointer"
            })
          }}
        />
      )}
    </>
  );
}
