﻿//--------------------------------------------------------------
//
//    MIT License
//
//    Copyright (c) Microsoft Corporation. All rights reserved.
//
//--------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace JsDbg.Core {
    class ConstantCache {
        public ConstantCache(List<SConstantResult> constants) {
            foreach (var constant in constants) {
                this.Values[constant.ConstantName] = constant.Value;
                if (!this.Names.ContainsKey(constant.Value)) {
                    this.Names[constant.Value] = new List<string>();
                }
                this.Names[constant.Value].Add(constant.ConstantName);
            }
        }

        public bool TryGetValue(string name, out ulong value) {
            return this.Values.TryGetValue(name, out value);
        }

        public bool TryGetNames(ulong value, out IEnumerable<string> names) {
            bool result = this.Names.TryGetValue(value, out var list);
            names = list;
            return result;
        }

        private Dictionary<string, ulong> Values = new Dictionary<string, ulong>();
        private Dictionary<ulong, List<string>> Names = new Dictionary<ulong, List<string>>();
    }
}
