// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Simple test contract for Saga chainlet compatibility
 * Uses only basic opcodes compatible with older EVM versions
 */
contract SimpleTest {
    uint256 public value;
    
    event ValueSet(uint256 newValue);
    
    function setValue(uint256 _value) external {
        value = _value;
        emit ValueSet(_value);
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
}