// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title Starling.ai Governance Token (STARL)
 * @dev Implementation of the STARL token with governance capabilities
 */
contract Starling.aiToken is 
    ERC20, 
    ERC20Burnable, 
    ERC20Snapshot, 
    Ownable, 
    Pausable, 
    ERC20Permit, 
    ERC20Votes 
{
    // Token distribution
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant REWARDS_ALLOCATION = 700_000_000 * 10**18; // 70%
    uint256 public constant PLATFORM_ALLOCATION = 200_000_000 * 10**18; // 20%
    uint256 public constant LIQUIDITY_ALLOCATION = 100_000_000 * 10**18; // 10%

    // Vesting
    mapping(address => VestingSchedule) public vestingSchedules;
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 cliffDuration;
    }

    // Events
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount, string reason);

    constructor() 
        ERC20("Starling.ai", "STARL") 
        ERC20Permit("Starling.ai") 
    {
        // Mint initial allocations
        _mint(address(this), REWARDS_ALLOCATION); // For rewards distribution
        _mint(msg.sender, PLATFORM_ALLOCATION); // Platform treasury
        _mint(address(this), LIQUIDITY_ALLOCATION); // For liquidity pools
    }

    /**
     * @dev Create a vesting schedule for a beneficiary
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");
        require(cliffDuration <= duration, "Cliff > duration");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule exists");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            duration: duration,
            cliffDuration: cliffDuration
        });

        emit VestingScheduleCreated(
            beneficiary,
            totalAmount,
            startTime,
            duration,
            cliffDuration
        );
    }

    /**
     * @dev Release vested tokens
     */
    function releaseVestedTokens() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");

        uint256 releasable = _releasableAmount(msg.sender);
        require(releasable > 0, "No tokens to release");

        schedule.releasedAmount += releasable;
        _transfer(address(this), msg.sender, releasable);

        emit TokensReleased(msg.sender, releasable);
    }

    /**
     * @dev Calculate releasable amount for a beneficiary
     */
    function _releasableAmount(address beneficiary) private view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp - schedule.startTime;
        if (elapsedTime >= schedule.duration) {
            return schedule.totalAmount - schedule.releasedAmount;
        }

        uint256 vestedAmount = (schedule.totalAmount * elapsedTime) / schedule.duration;
        return vestedAmount - schedule.releasedAmount;
    }

    /**
     * @dev Distribute rewards to users
     */
    function distributeRewards(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(address(this), recipients[i], amounts[i]);
            emit RewardsDistributed(recipients[i], amounts[i], reason);
        }
    }

    /**
     * @dev Pause token transfers
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Snapshot token balances
     */
    function snapshot() public onlyOwner {
        _snapshot();
    }

    // Override required functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
} 