﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace Sushraja.Jump {
    class JumpConfiguration : Core.IConfiguration {
        internal static JumpConfiguration Load() {
            return new JumpConfiguration();
        }

        public string SharedSupportDirectory {
            get {
                return Path.Combine(@"\\iefs\users\psalas\jsdbg\support\", Version);
            }
        }
        public string PersistentStoreDirectory {
            get {
                return @"\\iefs\users\psalas\jsdbg\support\persistent";
            }
        }

        public string LocalSupportDirectory {
            get {
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "JsDbg", "support", Version);
            }
        }

        private const string Version = "2014-07-23-01";
    }
}
