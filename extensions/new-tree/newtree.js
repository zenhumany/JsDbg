"use strict";

var Tree = (function() {
    var registeredTypes = {};
    var registeredRoots = [];
    var registeredAddressInterpreters = [];

    function flatten(array, result) {
        if (result === undefined) {
            result = [];
        }
        for (var i = 0; i < array.length; ++i) {
            var item = array[i];
            if (item && item.length !== undefined) {
                flatten(item, result);
            } else {
                result.push(item);
            }
        }
        return result;
    }

    function TreeNode(dbgObject, basicDescription) {
        this.dbgObject = dbgObject;
        this.basicDescription = basicDescription === undefined || basicDescription === null ? this.dbgObject.htmlTypeDescription() : basicDescription;
        this.childrenPromise = null;
        this.matchingRegistrationsPromise = null;
        this.basicDescriptionPromise = null;
        this.recordedErrors = [];
    }

    TreeNode.prototype.getMatchingRegistrations = function() {
        if (this.matchingRegistrationsPromise == null) {
            var that = this;
            this.matchingRegistrationsPromise = this.dbgObject
            // Get all the base types.
            .baseTypes()

            // For each base type collect all the children.
            .then(function(baseTypes) {
                baseTypes.reverse();
                baseTypes.push(that.dbgObject);
                return Promise
                .map(
                    // Only consider objects that have a registered type handler.
                    baseTypes.filter(function (object) { return object.typeDescription() in registeredTypes; }),

                    // Get the children.
                    function (object) {
                        return Promise
                        // Filter out any registrations that don't match.
                        .filter(
                            registeredTypes[object.typeDescription()],
                            function (registration) {
                                return registration.isMatched(object);
                            }
                        )
                    }
                )
            })

            // Flatten the list of list of registrations.
            .then(flatten);
        }

        return this.matchingRegistrationsPromise;
    }

    TreeNode.prototype.getChildren = function() {
        if (this.childrenPromise == null) {
            var that = this;
            this.childrenPromise = this.getMatchingRegistrations(this.dbgObject)
            .then(function (registrations) {
                return Promise.map(registrations, function (registration) { 
                    if (registration.getChildren) {
                        return Promise.as(registration.getChildren(that.dbgObject))
                        .then(null, function (error) {
                            that.recordedErrors.push(error);
                            return [];
                        })
                    } else {
                        return [];
                    }
                });

            })
            .then(flatten)
            .then(function (children) {
                return children.map(function (child) { return new TreeNode(child); });
            })
            .then(null, function (error) {
                that.recordedErrors.push(error);
                return [];
            });
        }
        return this.childrenPromise;
    }

    TreeNode.prototype.createRepresentation = function() {
        var that = this;
        if (this.basicDescriptionPromise == null) {
            this.basicDescriptionPromise = this.getMatchingRegistrations()
            .then(function (registrations) {
                var registrationToUse = null;
                var basicDescriptionRegistrations = registrations.filter(function (reg) { return reg.getBasicDescription ? true : false; });
                var namedRegistrations = registrations.filter(function (reg) { return reg.name ? true : false; });

                if (basicDescriptionRegistrations.length > 0) {
                    return basicDescriptionRegistrations[basicDescriptionRegistrations.length - 1].getBasicDescription(that.dbgObject);
                } else if (namedRegistrations.length > 0) {
                    return namedRegistrations[namedRegistrations.length - 1].name;
                } else {
                    return that.dbgObject.htmlTypeDescription();
                }
            })
            .then(null, function (error) {
                that.recordedErrors.push(error);
                return that.dbgObject.htmlTypeDescription();
            })
        }

        return this.basicDescriptionPromise.then(function (basicDescription) {
            var result = document.createElement("div");
            result.textContent = basicDescription + " " + that.dbgObject.ptr();

            if (that.recordedErrors.length > 0) {
                var errorContainer = document.createElement("div");
                errorContainer.className = "error-container";

                var errorDiv = document.createElement("div");
                errorDiv.className = "error-icon";
                errorDiv.textContent = "!";
                errorContainer.appendChild(errorDiv);

                var descriptions = document.createElement("div");
                descriptions.className = "error-descriptions";
                that.recordedErrors.forEach(function (error) {
                    var errorElement = document.createElement("div");
                    errorElement.textContent = JSON.stringify(error);
                    descriptions.appendChild(errorElement);
                })
                errorContainer.appendChild(descriptions);
                result.appendChild(errorContainer);
            }
            return result;
        });
    }



    return {
        AddType: function(name, typename, discriminant, getChildren, getBasicDescription) {
            if (!(typename in registeredTypes)) {
                registeredTypes[typename] = [];
            }
            registeredTypes[typename].push({
                name: name ? name : typename,
                isMatched: discriminant ? discriminant : function() { return true; },
                getChildren: getChildren ? getChildren : function() { return []; },
                getBasicDescription: typeof(getBasicDescription) == typeof("") ? function() { return getBasicDescription; } : getBasicDescription
            });
        },

        AddRoot: function(name, getRoots) {
            registeredRoots.push({
                name: name,
                getRoots: getRoots
            });
        },

        AddAddressInterpreter: function(addressInterpreter) {
            registeredAddressInterpreters.push(addressInterpreter);
        },

        InterpretAddress: function (address) {
            return Promise.map(registeredAddressInterpreters, function(interpreter) {
                return Promise.as(interpreter(address))
                .then(
                    function (dbgObject) {
                        return new TreeNode(dbgObject);
                    },
                    function (error) {
                        return null;
                    }
                )
            })
            .then(function (results) {
                for (var i = 0; i < results.length; ++i) {
                    if (results[i] != null) {
                        return results[i];
                    }
                }

                throw new Error("Invalid root address.");
            })
        },

        RenderTreeNode: function(container, treeNode, treeAlgorithm) {
            return Promise.as(treeNode)
            .then(function (treeNode) {
                var innerElement = document.createElement("div");
                container.appendChild(innerElement);
                treeAlgorithm.BuildTree(innerElement, treeNode, true);
            });
        },

        GetRootTreeNodes: function() {
            return Promise
            .map(
                registeredRoots,
                function (rootRegistration) {
                    return rootRegistration.getRoots();
                }
            )
            .then(function (roots) {
                return flatten(roots)
                .map(function (root) {                     
                    return new TreeNode(root);
                })
            });
        },

        Render: function(element) {
            return Tree.GetRootTreeNodes()
            .then(function (treeNodes) {
                return treeNodes.forEach(function(treeNode) {
                    Tree.RenderTreeNode(element, treeNode, TallTree);
                })
            });
        }
    }
})();